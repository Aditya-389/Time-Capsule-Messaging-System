import { z } from "zod";

const RECIPIENT_EMAIL_ERROR = "Recipient email is required. Please enter a valid email id";
const MESSAGE_REQUIRED_ERROR = "Message is required";
const DELIVER_AT_REQUIRED_ERROR = "Deliver at is required";

const recipientEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({
        code: "custom",
        message: RECIPIENT_EMAIL_ERROR
      });
      return;
    }

    const isValidEmail = z.email().safeParse(value).success;

    if (!isValidEmail) {
      ctx.addIssue({
        code: "custom",
        message: RECIPIENT_EMAIL_ERROR
      });
    }
  })
).transform((value) => value.toLowerCase());

const messageBodySchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .string()
    .min(1, MESSAGE_REQUIRED_ERROR)
    .max(500, "Message must be at most 500 characters")
);

const deliverAtSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, DELIVER_AT_REQUIRED_ERROR)
).transform((value, ctx) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    ctx.addIssue({
      code: "custom",
      message: "Deliver at must be a valid ISO datetime"
    });
    return z.NEVER;
  }

  return parsedDate;
}).refine((value) => value.getTime() > Date.now(), {
  message: "Deliver at must be in the future"
});

export const createMessageSchema = z.object({
  recipient_email: recipientEmailSchema,
  message: messageBodySchema,
  deliver_at: deliverAtSchema
}).strict();
