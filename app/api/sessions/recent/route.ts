import { getMostRecentSession } from "../../../../lib/repositories/runash-chat"

import { handleGetRecentSession } from "./get-recent-session-handler"

function getRequestUserId(req: Request) {
  const userId = req.headers.get("x-runash-user-id")
  return typeof userId === "string" ? userId : undefined
}

export async function GET(req: Request) {
  return handleGetRecentSession({
    getMostRecentSession: () => getMostRecentSession(getRequestUserId(req)),
  })
}
