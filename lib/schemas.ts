import { z } from "zod"

export const passwordSchema = z
  .string()
  .min(8, { error: "Be at least 8 characters long." })
  .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
  .regex(/[0-9]/, { error: "Contain at least one number." })
  .regex(/[^a-zA-Z0-9]/, { error: "Contain at least one special character." })
  .trim()

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
})

export const createUserSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: passwordSchema,
  role: z.enum(["owner", "cashier"]),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: "Current password is required." }),
  newPassword: passwordSchema,
})

export const changeEmailSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
})

export const resetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive(),
  newPassword: passwordSchema,
})

export const productCreateSchema = z.object({
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
  category: z.string().trim().optional(),
  price: z.coerce.number().nonnegative({ error: "Price cannot be negative." }),
  costPrice: z.coerce.number().nonnegative({ error: "Cost price cannot be negative." }).optional().default(0),
  isActive: z.boolean().optional().default(true),
  initialStock: z.coerce.number().int().nonnegative({ error: "Initial stock cannot be negative." }).optional().default(0),
})

export const productUpdateSchema = z.object({
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
  category: z.string().trim().optional(),
  price: z.coerce.number().nonnegative({ error: "Price cannot be negative." }),
  costPrice: z.coerce.number().nonnegative({ error: "Cost price cannot be negative." }).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const stockInItemSchema = z.object({
  id: z.number().int().positive(),
  quantity: z.number().int().positive({ error: "Quantity must be at least 1." }),
})

export const stockInSchema = z.object({
  items: z.array(stockInItemSchema).min(1, { error: "Add at least one item." }),
})

export type FormState =
  | {
      errors?: Record<string, string[]>
      message?: string
      ok?: boolean
    }
  | undefined
