import { renderSupportLinks } from "./partials"

export const brandStyles = `
  body { margin:0; padding:0; background:#f3f4f6; font-family: Inter, Arial, sans-serif; color:#111827; }
  .wrapper { padding:24px 12px; }
  .card { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb; }
  .content { padding:24px; line-height:1.5; }
  h1 { margin:0 0 12px; font-size:24px; }
`

export function renderHeader(appName: string): string {
  return `<div style="background:#111827;color:#fff;padding:16px 24px;font-weight:700;letter-spacing:.2px;">${appName}</div>`
}

export function renderFooter(baseUrl: string, supportEmail: string, companyName: string): string {
  return `<div style="padding:20px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    ${renderSupportLinks(baseUrl, supportEmail)}
    <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  </div>`
}

export function renderBaseLayout(args: {
  appName: string
  baseUrl: string
  supportEmail: string
  companyName: string
  previewText: string
  body: string
}): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="x-preheader" content="${args.previewText}"/>
    <style>${brandStyles}</style></head>
    <body><div class="wrapper"><div class="card">${renderHeader(args.appName)}<div class="content">${args.body}</div>${renderFooter(args.baseUrl, args.supportEmail, args.companyName)}</div></div></body></html>`
}
