import { z } from "zod";

/**
 * Single source of truth for bundle form validation. Shared by the create and
 * edit actions. The string-literal arrays intentionally mirror the Prisma enums
 * (their outputs are assignable to the Prisma enum unions), so we validate and
 * type in one place without pulling Prisma into the schema.
 */
export const BUNDLE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const BUNDLE_TYPES = ["FIXED", "CUSTOMIZABLE"] as const;
export const PRICING_TYPES = ["PERCENTAGE_DISCOUNT", "FIXED_PRICE", "FIXED_TOTAL"] as const;

export const bundleInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(255, "Title is too long"),
    description: z.string().trim().max(5000, "Description is too long").optional().default(""),
    type: z.enum(BUNDLE_TYPES),
    status: z.enum(BUNDLE_STATUSES),
    pricingType: z.enum(PRICING_TYPES),
    pricingValue: z.coerce.number().min(0, "Enter a value of 0 or more"),
  })
  .superRefine((val, ctx) => {
    // Pricing rules depend on the pricing type — the core domain invariant.
    if (val.pricingType === "PERCENTAGE_DISCOUNT") {
      if (val.pricingValue <= 0 || val.pricingValue > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["pricingValue"],
          message: "Percentage must be between 0 and 100",
        });
      }
    } else if (val.pricingValue <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["pricingValue"],
        message: "Price must be greater than 0",
      });
    }
  });

export type BundleInput = z.infer<typeof bundleInputSchema>;

/** Flatten ZodError into a { field: messages[] } map (version-proof). */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
