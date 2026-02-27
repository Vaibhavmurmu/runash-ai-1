export function resolveRequestedToolsForMessage(content: string) {
  const isInstantCheckoutIntent = /\b(buy this|confirm purchase|pay now|instant checkout|checkout|confirm)\b/i.test(content)
  if (isInstantCheckoutIntent) {
    return ["catalog_lookup", "initiate_link_checkout"] as const
  }

  const isBrokerMatchIntent = /\b(broker|match supplier|match buyer|mediate|settlement|deal match)\b/i.test(content)
  if (isBrokerMatchIntent) {
    return ["broker_match_deal", "create_initial_quote", "submit_counter_offer", "broker_settle_deal"] as const
  }

  const isSellerOptimizationIntent = /\b(optimi[sz]e|pricing|inventory|bundle|promotion|margin)\b/i.test(content)
  if (isSellerOptimizationIntent) {
    return ["seller_optimize_commerce", "inventory_health", "catalog_lookup"] as const
  }

  const isBuyerDiscoveryIntent = /\b(find|compare|best(?:\s+under)?|under\s+(?:₹|\$|usd|inr)?\s*\d+)\b/i.test(content)
  if (isBuyerDiscoveryIntent) {
    return ["buyer_product_search", "catalog_lookup", "web_search"] as const
  }

  const isSearchIntent = /search|find|best|compare|web/i.test(content)
  if (isSearchIntent) {
    return ["catalog_lookup", "web_search"] as const
  }

  return ["catalog_lookup"] as const
}
