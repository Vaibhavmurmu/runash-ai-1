export function resolveRequestedToolsForMessage(content: string) {
  const isInstantCheckoutIntent = /\b(buy this|confirm purchase|pay now|instant checkout|checkout|confirm)\b/i.test(content)
  if (isInstantCheckoutIntent) {
    return ["catalog_lookup", "initiate_link_checkout"] as const
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
