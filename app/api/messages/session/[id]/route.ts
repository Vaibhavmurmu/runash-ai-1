import { listSessionMessages } from "../../../../../lib/repositories/runash-chat"

import { handleGetSessionMessages } from "./get-session-messages-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleGetSessionMessages(request, params, { listSessionMessages })
}
