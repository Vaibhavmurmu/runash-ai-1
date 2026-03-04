#!/usr/bin/env node
import { promises as fs } from "node:fs"
import path from "node:path"

const rootDir = process.cwd()
const authApiDir = path.join(rootDir, "app/api/auth")
const scimApiDir = path.join(rootDir, "app/api/scim/v2")
const outputPath = path.join(rootDir, "docs/openapi/auth.openapi.json")

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

const pluginEnabled = {
  otp: process.env.AUTH_PLUGIN_OTP !== "false",
  siwe: process.env.AUTH_PLUGIN_SIWE !== "false",
  scim: process.env.AUTH_PLUGIN_SCIM !== "false",
  sso: process.env.AUTH_PLUGIN_SSO !== "false",
  deviceFlow: process.env.AUTH_PLUGIN_DEVICE_FLOW !== "false",
  bearer: process.env.AUTH_PLUGIN_BEARER !== "false",
  ott: process.env.AUTH_PLUGIN_OTT !== "false",
}

const operationOverrides = {
  "POST /api/auth/otp/email": {
    tags: ["OTP"],
    summary: "Send email OTP",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            loginOtp: {
              summary: "Login OTP",
              value: { email: "seller@runash.ai", purpose: "login" },
            },
          },
        },
      },
    },
  },
  "PUT /api/auth/otp/email": {
    tags: ["OTP"],
    summary: "Verify email OTP",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            verifyOtp: {
              value: { email: "seller@runash.ai", code: "123456", purpose: "login" },
            },
          },
        },
      },
    },
  },
  "POST /api/auth/siwe/verify": {
    tags: ["SIWE"],
    summary: "Verify Sign-In with Ethereum",
    security: [{ cookieAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            siweVerification: {
              value: {
                nonce: "nonce_123",
                message: "runash.ai wants you to sign in with your Ethereum account...",
                signature: "0xabc123",
                walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
                chainId: 1,
              },
            },
          },
        },
      },
    },
  },
  "POST /api/auth/sso/check": {
    tags: ["SSO"],
    summary: "Check enterprise SSO availability by email domain",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            domainLookup: { value: { email: "user@enterprise.example" } },
          },
        },
      },
    },
  },
  "POST /api/auth/oauth/device/authorize": {
    tags: ["Device Flow"],
    summary: "Start OAuth device authorization",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            authorize: { value: { client_id: "runash-kiosk", scope: "openid profile" } },
          },
        },
      },
    },
  },
  "POST /api/auth/oauth/device/token": {
    tags: ["Device Flow"],
    summary: "Exchange OAuth device code for access token",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            exchange: {
              value: {
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                device_code: "dev_123",
              },
            },
          },
        },
      },
    },
  },
  "POST /api/auth/bearer-token": {
    tags: ["Bearer"],
    summary: "Issue bearer session token",
    security: [{ cookieAuth: [] }],
    requestBody: {
      required: false,
      content: {
        "application/json": {
          examples: {
            issueToken: { value: { scope: "api", ttlMinutes: 60 } },
          },
        },
      },
    },
  },
  "DELETE /api/auth/bearer-token": {
    tags: ["Bearer"],
    summary: "Revoke bearer session token",
    security: [{ cookieAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            revokeToken: { value: { sessionId: "session_123" } },
          },
        },
      },
    },
  },
  "POST /api/auth/ott/issue": {
    tags: ["OTT"],
    summary: "Issue one-time transfer token",
    security: [{ cookieAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            issueOtt: {
              value: {
                sourceDomain: "console.runash.ai",
                targetDomain: "stream.runash.ai",
                ttlSeconds: 120,
              },
            },
          },
        },
      },
    },
  },
  "POST /api/auth/ott/verify": {
    tags: ["OTT"],
    summary: "Verify one-time transfer token",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            verifyOtt: {
              value: {
                token: "ott_123",
                sourceDomain: "console.runash.ai",
                targetDomain: "stream.runash.ai",
              },
            },
          },
        },
      },
    },
  },
  "GET /api/scim/v2/Users": {
    tags: ["SCIM"],
    summary: "List SCIM users for an organization",
    security: [{ scimBearer: [] }],
  },
  "POST /api/scim/v2/Users": {
    tags: ["SCIM"],
    summary: "Provision SCIM user",
    security: [{ scimBearer: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          examples: {
            createScimUser: {
              value: {
                organizationId: 42,
                externalId: "okta-usr-1001",
                userName: "user@enterprise.example",
                active: true,
              },
            },
          },
        },
      },
    },
  },
  "PATCH /api/scim/v2/Users": {
    tags: ["SCIM"],
    summary: "Deactivate SCIM user",
    security: [{ scimBearer: [] }],
  },
}

const pluginMatcher = [
  { name: "otp", paths: ["/api/auth/otp", "/api/auth/phone-otp"] },
  { name: "siwe", paths: ["/api/auth/siwe"] },
  { name: "scim", paths: ["/api/scim/v2"] },
  { name: "sso", paths: ["/api/auth/sso"] },
  { name: "deviceFlow", paths: ["/api/auth/oauth/device"] },
  { name: "bearer", paths: ["/api/auth/bearer-token"] },
  { name: "ott", paths: ["/api/auth/ott"] },
]

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath)
    }
  }
  return files
}

function toApiPath(filePath) {
  const relative = path.relative(path.join(rootDir, "app"), filePath)
  const withoutRoute = relative.replace(/\/route\.ts$/, "")
  const segments = withoutRoute.split(path.sep)
  return `/${segments
    .map((segment) => {
      if (segment.startsWith("[[...") && segment.endsWith("]]")) return `{${segment.slice(5, -2)}}`
      if (segment.startsWith("[...") && segment.endsWith("]")) return `{${segment.slice(4, -1)}}`
      if (segment.startsWith("[") && segment.endsWith("]")) return `{${segment.slice(1, -1)}}`
      return segment
    })
    .join("/")}`
}

function extractMethods(content) {
  return httpMethods.filter((method) => new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(content))
}

function operationFor(method, apiPath) {
  const key = `${method} ${apiPath}`
  const override = operationOverrides[key] ?? {}
  return {
    operationId: `${method.toLowerCase()}_${apiPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    tags: override.tags ?? [apiPath.startsWith("/api/scim/") ? "SCIM" : "Core Auth"],
    summary: override.summary ?? `${method} ${apiPath}`,
    security: override.security ?? defaultSecurity(apiPath),
    responses: {
      "200": { description: "Successful response" },
      "400": { description: "Invalid request" },
      "401": { description: "Unauthorized" },
      "500": { description: "Server error" },
    },
    ...(override.requestBody ? { requestBody: override.requestBody } : {}),
  }
}

function defaultSecurity(apiPath) {
  if (apiPath.startsWith("/api/scim/")) return [{ scimBearer: [] }]
  if (["/api/auth/session", "/api/auth/get-session"].includes(apiPath)) return [{ cookieAuth: [] }]
  return []
}

function isPathEnabled(apiPath) {
  for (const plugin of pluginMatcher) {
    if (plugin.paths.some((prefix) => apiPath.startsWith(prefix))) {
      return pluginEnabled[plugin.name]
    }
  }

  return true
}

async function generate() {
  const routeFiles = [...(await walk(authApiDir)), ...(await walk(scimApiDir))]
  const paths = {}

  for (const file of routeFiles) {
    const apiPath = toApiPath(file)
    if (!isPathEnabled(apiPath)) continue

    const source = await fs.readFile(file, "utf8")
    const methods = extractMethods(source)
    if (methods.length === 0) continue

    paths[apiPath] = paths[apiPath] ?? {}
    for (const method of methods) {
      paths[apiPath][method.toLowerCase()] = operationFor(method, apiPath)
    }
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "RunAsh Auth API",
      version: "1.0.0",
      description: "OpenAPI contract for core auth routes and enabled auth plugins.",
    },
    servers: [{ url: "/", description: "RunAsh deployment" }],
    tags: [
      { name: "Core Auth" },
      { name: "OTP" },
      { name: "SIWE" },
      { name: "SCIM" },
      { name: "SSO" },
      { name: "Device Flow" },
      { name: "Bearer" },
      { name: "OTT" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session-token",
          description: "Better Auth session cookie.",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        scimBearer: {
          type: "http",
          scheme: "bearer",
          description: "SCIM provisioning token.",
        },
      },
    },
    paths,
    "x-runash-auth-plugins": pluginEnabled,
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8")
  console.log(`Generated ${path.relative(rootDir, outputPath)} with ${Object.keys(paths).length} paths.`)
}

generate().catch((error) => {
  console.error(error)
  process.exit(1)
})
