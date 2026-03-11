import { createStreamBackgroundCollection, listStreamBackgroundCollections } from "@/lib/repositories/stream-studio"
import { requireStreamOwner } from "../_auth"
import { createBackgroundCollectionsRoutes } from "./collections-route-handler"

const routes = createBackgroundCollectionsRoutes({
  requireOwner: requireStreamOwner,
  listCollections: listStreamBackgroundCollections,
  createCollection: createStreamBackgroundCollection,
})

export const GET = routes.GET
export const POST = routes.POST
