import { z } from "zod"

export const checkoutOrderItemSchema = z
  .object({
    product_id: z.union([z.string(), z.number()]).optional().nullable(),
    name: z.string().trim().min(1, "Item name is required"),
    quantity: z.number().int().positive("Item quantity must be greater than 0"),
    price: z.number().nonnegative("Item price must be greater than or equal to 0"),
    selectedVariant: z
      .object({
        id: z.string().optional(),
        stripePriceId: z.string().optional(),
      })
      .passthrough()
      .optional(),
    product: z
      .object({
        id: z.string().optional(),
        stripePriceId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export const checkoutOrderSchema = z
  .object({
    id: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    customer: z.object({
      email: z.string().email("A valid buyer email is required"),
      firstName: z.string().trim().min(1, "Buyer first name is required"),
      lastName: z.string().trim().min(1, "Buyer last name is required"),
      address: z.string().trim().min(1, "Shipping address is required"),
      city: z.string().trim().min(1, "Shipping city is required"),
      state: z.string().trim().optional().default(""),
      zipCode: z.string().trim().min(1, "ZIP code is required"),
      phone: z.string().trim().optional(),
    }),
    payment: z.object({
      method: z.enum(["card", "upi"]),
      cardNumber: z.string().optional(),
      nameOnCard: z.string().optional(),
      saveForFastCheckout: z.boolean().optional(),
      buyAsBusiness: z.boolean().optional(),
    }),
    items: z.array(checkoutOrderItemSchema).min(1, "At least one item is required"),
    totals: z.object({
      subtotal: z.number().nonnegative().optional(),
      shipping: z.number().nonnegative().optional(),
      tax: z.number().nonnegative().optional(),
      discount: z.number().nonnegative().optional(),
      total: z.number().nonnegative(),
      savings: z.number().nonnegative().optional(),
    }),
    checkout: z
      .object({
        priceId: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

export type CheckoutOrderDTO = z.infer<typeof checkoutOrderSchema>
