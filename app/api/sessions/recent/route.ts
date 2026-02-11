import { getMostRecentSession } from "../../../../lib/repositories/runash-chat"

import { handleGetRecentSession } from "./get-recent-session-handler"

export async function GET() {
  return handleGetRecentSession({ getMostRecentSession })
}
