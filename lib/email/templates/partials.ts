export function renderCta(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${label}</a>`
}

export function renderSummaryTable(rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .map(
      (row) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${row.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;text-align:right;">${row.value}</td>
      </tr>`,
    )
    .join("")

  return `<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${rowHtml}</table>`
}

export function renderSupportLinks(baseUrl: string, supportEmail: string): string {
  return `<p style="margin:16px 0 0;color:#6b7280;font-size:14px;">Need help? <a href="mailto:${supportEmail}">${supportEmail}</a> • <a href="${baseUrl}/help">Help Center</a> • <a href="${baseUrl}/status">System Status</a></p>`
}
