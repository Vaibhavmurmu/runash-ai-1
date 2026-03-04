export type PollQuizKind = "poll" | "quiz"
export type PollQuizLifecycle = "draft" | "live" | "closed"

export interface PollQuizOption {
  id: string
  text: string
  votes: number
  isCorrect?: boolean
}

export interface PollQuiz {
  id: string
  streamId: string
  kind: PollQuizKind
  question: string
  options: PollQuizOption[]
  status: PollQuizLifecycle
  createdAt: number
  startedAt?: number
  endedAt?: number
}

export interface PollQuizState {
  items: PollQuiz[]
}

export type PollQuizAction =
  | { type: "create"; payload: PollQuiz }
  | { type: "start"; pollId: string; startedAt?: number }
  | { type: "close"; pollId: string; endedAt?: number }
  | { type: "vote"; pollId: string; optionId: string }

export const initialPollQuizState: PollQuizState = { items: [] }

export function pollQuizReducer(state: PollQuizState, action: PollQuizAction): PollQuizState {
  switch (action.type) {
    case "create":
      return { items: [action.payload, ...state.items.filter((item) => item.id !== action.payload.id)] }
    case "start":
      return {
        items: state.items.map((item) =>
          item.id === action.pollId
            ? { ...item, status: "live", startedAt: action.startedAt ?? Date.now() }
            : item,
        ),
      }
    case "close":
      return {
        items: state.items.map((item) =>
          item.id === action.pollId
            ? { ...item, status: "closed", endedAt: action.endedAt ?? Date.now() }
            : item,
        ),
      }
    case "vote":
      return {
        items: state.items.map((item) => {
          if (item.id !== action.pollId || item.status !== "live") {
            return item
          }

          return {
            ...item,
            options: item.options.map((option) =>
              option.id === action.optionId ? { ...option, votes: option.votes + 1 } : option,
            ),
          }
        }),
      }
    default:
      return state
  }
}

const streams = new Map<string, PollQuizState>()

function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createPollQuiz(input: {
  streamId: string
  kind: PollQuizKind
  question: string
  options: Array<{ text: string; isCorrect?: boolean }>
}) {
  const poll: PollQuiz = {
    id: nextId(input.kind),
    streamId: input.streamId,
    kind: input.kind,
    question: input.question,
    status: "draft",
    createdAt: Date.now(),
    options: input.options.map((option) => ({
      id: nextId("opt"),
      text: option.text,
      votes: 0,
      isCorrect: option.isCorrect,
    })),
  }

  const state = streams.get(input.streamId) ?? initialPollQuizState
  const nextState = pollQuizReducer(state, { type: "create", payload: poll })
  streams.set(input.streamId, nextState)
  return poll
}

export function getPollQuizzes(streamId: string) {
  return (streams.get(streamId) ?? initialPollQuizState).items
}

export function applyPollQuizAction(streamId: string, action: PollQuizAction) {
  const state = streams.get(streamId) ?? initialPollQuizState
  const nextState = pollQuizReducer(state, action)
  streams.set(streamId, nextState)
  return nextState.items.find((item) => item.id === ("pollId" in action ? action.pollId : action.payload.id)) ?? null
}
