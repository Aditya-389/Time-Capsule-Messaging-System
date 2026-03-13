import { z } from "zod";

const EMAIL_ERROR_MESSAGE = "Email is required. Please enter a valid email id";
const PASSWORD_REQUIRED_MESSAGE = "Password is required";

const normalizedEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .string()
    .superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({
          code: "custom",
          message: EMAIL_ERROR_MESSAGE
        });
        return;
      }

      const isValidEmail = z.email().safeParse(value).success;

      if (!isValidEmail) {
        ctx.addIssue({
          code: "custom",
          message: EMAIL_ERROR_MESSAGE
        });
      }
    })
).transform((value) => value.toLowerCase());

const passwordSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z
    .string()
    .min(1, PASSWORD_REQUIRED_MESSAGE)
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
);

const loginPasswordSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string().min(1, PASSWORD_REQUIRED_MESSAGE)
);

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .max(100, "Full name must be at most 100 characters")
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

export const signupSchema = z.object({
  email: normalizedEmail,
  password: passwordSchema,
  fullName: fullNameSchema
}).strict();

export const loginSchema = z.object({
  email: normalizedEmail,
  password: loginPasswordSchema
}).strict();
