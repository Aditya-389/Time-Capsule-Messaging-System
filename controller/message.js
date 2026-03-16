import { createMessageSchema } from "../validator/message.js";
import {
  createMessage,
  getMessagesByUserId
} from "../services/message.service.js";

const formatZodError = (error) => {
  const { fieldErrors } = error.flatten();

  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0] || "Invalid input"
    ])
  );
};

export const createScheduledMessage = async (req, res) => {
  try {
    const parsed = createMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodError(parsed.error)
      });
    }

    const createdMessage = await createMessage({
      userId: req.user.id,
      recipientEmail: parsed.data.recipient_email,
      message: parsed.data.message,
      deliverAt: parsed.data.deliver_at
    });

    return res.status(201).json({
      success: true,
      message: "Message scheduled successfully",
      data: createdMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to schedule message",
      error: error.message
    });
  }
};

export const getScheduledMessages = async (req, res) => {
  try {
    const messages = await getMessagesByUserId(req.user.id);

    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message
    });
  }
};
