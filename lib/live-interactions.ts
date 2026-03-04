import { Redis } from "@upstash/redis"

export type PollOption = {
  id: string
  label: string
  votes: number
}

export type LivePoll = {
  id: string
  streamId: string
  question: string
  options: PollOption[]
  status: "active" | "ended"
  createdAt: number
  endedAt?: number
}

export type LiveQuestion = {
  id: string
  streamId: string
  username: string
  text: string
  selected: boolean
  createdAt: number
}

export type LiveQASession = {
  id: string
  streamId: string
  prompt: string
  status: "active" | "ended"
  createdAt: number
  endedAt?: number
}

export type LiveInteractionState = {
  streamId: string
  pinnedMessageId: string | null
  reactionsEnabled: boolean
  memberOnly: boolean
  activePollId: string | null
  activeQASessionId: string | null
  updatedAt: number
}

let _redis: Redis | null = null

function redis() {
  if (_redis) return _redis
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  _redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  return _redis
}

const memoryState = new Map<string, LiveInteractionState>()
const memoryPolls = new Map<string, LivePoll[]>()
const memoryQuestions = new Map<string, LiveQuestion[]>()
const memoryQaSessions = new Map<string, LiveQASession[]>()

function stateKey(streamId: string) {
  return `stream:${streamId}:interaction:state`
}

function pollsKey(streamId: string) {
  return `stream:${streamId}:interaction:polls`
}

function qaSessionsKey(streamId: string) {
  return `stream:${streamId}:interaction:qa:sessions`
}

function questionsKey(streamId: string) {
  return `stream:${streamId}:interaction:qa:questions`
}

function defaultState(streamId: string): LiveInteractionState {
  return {
    streamId,
    pinnedMessageId: null,
    reactionsEnabled: true,
    memberOnly: false,
    activePollId: null,
    activeQASessionId: null,
    updatedAt: Date.now(),
  }
}

async function getCollection<T>(streamId: string, keyFactory: (streamId: string) => string, memory: Map<string, T[]>): Promise<T[]> {
  const r = redis()
  if (r) {
    const raw = await r.get<T[]>(keyFactory(streamId))
    return Array.isArray(raw) ? raw : []
  }
  return memory.get(streamId) ?? []
}

async function setCollection<T>(streamId: string, keyFactory: (streamId: string) => string, memory: Map<string, T[]>, data: T[]) {
  const r = redis()
  if (r) {
    await r.set(keyFactory(streamId), data)
    return
  }
  memory.set(streamId, data)
}

export async function getInteractionState(streamId: string): Promise<LiveInteractionState> {
  const r = redis()
  if (r) {
    const existing = await r.get<LiveInteractionState>(stateKey(streamId))
    if (existing) return existing
    const initial = defaultState(streamId)
    await r.set(stateKey(streamId), initial)
    return initial
  }

  const existing = memoryState.get(streamId)
  if (existing) return existing
  const initial = defaultState(streamId)
  memoryState.set(streamId, initial)
  return initial
}

export async function updateInteractionState(streamId: string, patch: Partial<LiveInteractionState>) {
  const current = await getInteractionState(streamId)
  const next = { ...current, ...patch, updatedAt: Date.now() }

  const r = redis()
  if (r) {
    await r.set(stateKey(streamId), next)
    return next
  }

  memoryState.set(streamId, next)
  return next
}

export async function listPolls(streamId: string) {
  return getCollection(streamId, pollsKey, memoryPolls)
}

export async function createPoll(streamId: string, question: string, options: string[]) {
  const polls = await listPolls(streamId)
  const poll: LivePoll = {
    id: crypto.randomUUID(),
    streamId,
    question,
    options: options.map((label) => ({ id: crypto.randomUUID(), label, votes: 0 })),
    status: "active",
    createdAt: Date.now(),
  }
  polls.unshift(poll)
  await setCollection(streamId, pollsKey, memoryPolls, polls)
  await updateInteractionState(streamId, { activePollId: poll.id })
  return poll
}

export async function votePoll(streamId: string, pollId: string, optionId: string) {
  const polls = await listPolls(streamId)
  const index = polls.findIndex((poll) => poll.id === pollId)
  if (index < 0) return null

  const poll = polls[index]
  if (poll.status !== "active") return null

  const option = poll.options.find((item) => item.id === optionId)
  if (!option) return null

  option.votes += 1
  polls[index] = { ...poll }
  await setCollection(streamId, pollsKey, memoryPolls, polls)
  return polls[index]
}

export async function endPoll(streamId: string, pollId: string) {
  const polls = await listPolls(streamId)
  const index = polls.findIndex((poll) => poll.id === pollId)
  if (index < 0) return null

  const poll = polls[index]
  polls[index] = {
    ...poll,
    status: "ended",
    endedAt: Date.now(),
  }
  await setCollection(streamId, pollsKey, memoryPolls, polls)

  const state = await getInteractionState(streamId)
  if (state.activePollId === pollId) {
    await updateInteractionState(streamId, { activePollId: null })
  }

  return polls[index]
}

export async function listQASessions(streamId: string) {
  return getCollection(streamId, qaSessionsKey, memoryQaSessions)
}

export async function startQASession(streamId: string, prompt: string) {
  const sessions = await listQASessions(streamId)
  const session: LiveQASession = {
    id: crypto.randomUUID(),
    streamId,
    prompt,
    status: "active",
    createdAt: Date.now(),
  }
  sessions.unshift(session)
  await setCollection(streamId, qaSessionsKey, memoryQaSessions, sessions)
  await updateInteractionState(streamId, { activeQASessionId: session.id })
  return session
}

export async function endQASession(streamId: string, sessionId: string) {
  const sessions = await listQASessions(streamId)
  const index = sessions.findIndex((session) => session.id === sessionId)
  if (index < 0) return null

  sessions[index] = {
    ...sessions[index],
    status: "ended",
    endedAt: Date.now(),
  }
  await setCollection(streamId, qaSessionsKey, memoryQaSessions, sessions)

  const state = await getInteractionState(streamId)
  if (state.activeQASessionId === sessionId) {
    await updateInteractionState(streamId, { activeQASessionId: null })
  }

  return sessions[index]
}

export async function listQuestions(streamId: string) {
  return getCollection(streamId, questionsKey, memoryQuestions)
}

export async function submitQuestion(streamId: string, username: string, text: string) {
  const questions = await listQuestions(streamId)
  const question: LiveQuestion = {
    id: crypto.randomUUID(),
    streamId,
    username,
    text,
    selected: false,
    createdAt: Date.now(),
  }
  questions.unshift(question)
  await setCollection(streamId, questionsKey, memoryQuestions, questions)
  return question
}

export async function selectQuestion(streamId: string, questionId: string, selected: boolean) {
  const questions = await listQuestions(streamId)
  const index = questions.findIndex((item) => item.id === questionId)
  if (index < 0) return null

  questions[index] = {
    ...questions[index],
    selected,
  }
  await setCollection(streamId, questionsKey, memoryQuestions, questions)
  return questions[index]
}
