import { deleteStreamBackgroundCollection, updateStreamBackgroundCollection } from "@/lib/repositories/stream-studio"
import { requireStreamOwner } from "../../_auth"
import { createBackgroundCollectionByIdRoutes } from "./collection-by-id-route-handler"

const routes = createBackgroundCollectionByIdRoutes({
  requireOwner: requireStreamOwner,
  updateCollection: updateStreamBackgroundCollection,
  deleteCollection: deleteStreamBackgroundCollection,
})

export const PATCH = routes.PATCH
export const DELETE = routes.DELETE
