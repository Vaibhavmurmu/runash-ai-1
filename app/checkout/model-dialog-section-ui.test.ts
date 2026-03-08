import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { CheckoutModelDialogSection } from "@/components/checkout/model-dialog-checkout-section"

function renderCheckoutModelCard(step: "shipping" | "payment" | "review") {
  return renderToStaticMarkup(
    createElement("div", { "data-step": step },
      createElement(CheckoutModelDialogSection, {
        selectedPlan: "professional",
        selectedModelId: "gpt-4o-mini",
        selectedModelLabel: "GPT-4o mini",
        isSubmitting: false,
        submitError: null,
        onCheckoutSubmitFromReview: () => {},
      }),
    ),
  )
}

test("checkout model dialog card renders in a dedicated section", () => {
  const html = renderCheckoutModelCard("review")

  assert.match(html, /checkout-model-dialog-section/)
  assert.match(html, /AI Model Review/)
  assert.match(html, /Configure Model/)
})

test("selected plan\/model metadata remains visible across checkout step navigation", () => {
  const shippingHtml = renderCheckoutModelCard("shipping")
  const reviewHtml = renderCheckoutModelCard("review")

  assert.match(shippingHtml, /Plan: professional/)
  assert.match(shippingHtml, /Model: GPT-4o mini · gpt-4o-mini/)

  assert.match(reviewHtml, /Plan: professional/)
  assert.match(reviewHtml, /Model: GPT-4o mini · gpt-4o-mini/)
})
