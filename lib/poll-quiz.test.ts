import assert from "node:assert/strict"
import test from "node:test"
import { initialPollQuizState, pollQuizReducer, type PollQuiz } from "./poll-quiz"

function createBasePoll(status: PollQuiz["status"] = "draft"): PollQuiz {
  return {
    id: "poll-1",
    streamId: "stream-1",
    kind: "poll",
    question: "Best fruit?",
    status,
    createdAt: 1,
    options: [
      { id: "a", text: "Apple", votes: 0 },
      { id: "b", text: "Banana", votes: 0 },
    ],
  }
}

test("poll/quiz reducer creates, starts, votes, and closes", () => {
  const created = pollQuizReducer(initialPollQuizState, { type: "create", payload: createBasePoll() })
  assert.equal(created.items.length, 1)
  assert.equal(created.items[0].status, "draft")

  const started = pollQuizReducer(created, { type: "start", pollId: "poll-1", startedAt: 2 })
  assert.equal(started.items[0].status, "live")
  assert.equal(started.items[0].startedAt, 2)

  const voted = pollQuizReducer(started, { type: "vote", pollId: "poll-1", optionId: "b" })
  assert.equal(voted.items[0].options.find((option) => option.id === "b")?.votes, 1)

  const closed = pollQuizReducer(voted, { type: "close", pollId: "poll-1", endedAt: 3 })
  assert.equal(closed.items[0].status, "closed")
  assert.equal(closed.items[0].endedAt, 3)
})

test("votes are ignored when poll is not live", () => {
  const draftState = pollQuizReducer(initialPollQuizState, { type: "create", payload: createBasePoll("draft") })
  const votedDraft = pollQuizReducer(draftState, { type: "vote", pollId: "poll-1", optionId: "a" })
  assert.equal(votedDraft.items[0].options[0].votes, 0)

  const closedState = pollQuizReducer(initialPollQuizState, { type: "create", payload: createBasePoll("closed") })
  const votedClosed = pollQuizReducer(closedState, { type: "vote", pollId: "poll-1", optionId: "a" })
  assert.equal(votedClosed.items[0].options[0].votes, 0)
})
