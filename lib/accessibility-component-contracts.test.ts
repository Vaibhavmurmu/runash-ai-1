import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("header keeps keyboard-accessible icon actions and visible focus styles", () => {
  const navbarSource = source("components/dashboard/dashboard-navbar.tsx")

  assert.match(navbarSource, /aria-label="Open notifications"/)
  assert.match(navbarSource, /aria-label="Open action menu"/)
  assert.match(navbarSource, /focus-visible:ring-orange-500\/80/)
  assert.match(navbarSource, /<nav className="hidden items-center gap-1 text-sm font-medium text-foreground md:flex" aria-label="Current module breadcrumb">/)
})

test("sidebar trigger and actions expose labels with focus-visible rings", () => {
  const sidebarSource = source("components/ui/sidebar.tsx")

  assert.match(sidebarSource, /aria-label=\{ariaLabel\}/)
  assert.match(sidebarSource, /focus-visible:ring-orange-500\/80/)
  assert.match(sidebarSource, /<span className="sr-only">\{ariaLabel\}<\/span>/)
})

test("dialog preserves focus restore hook and keeps strong overlay contrast", () => {
  const feedbackModalSource = source("components/dashboard/feedback-modal.tsx")
  const dialogSource = source("components/ui/dialog.tsx")

  assert.match(feedbackModalSource, /onCloseAutoFocus=\{\(event\) => \{/)
  assert.match(feedbackModalSource, /restoreFocusTo\.focus\(\)/)
  assert.match(dialogSource, /bg-black\/85/)
})

test("auth forms include icon-button labels and improved muted text contrast", () => {
  const loginSource = source("components/auth/login-form.tsx")
  const registerSource = source("components/auth/register-form.tsx")

  assert.match(loginSource, /aria-label=\{showPassword \? "Hide password" : "Show password"\}/)
  assert.match(registerSource, /aria-label=\{showPassword \? "Hide password" : "Show password"\}/)
  assert.match(loginSource, /text-foreground\/80 dark:text-foreground\/75/)
  assert.match(registerSource, /text-foreground\/80 dark:text-foreground\/75/)
})
