import express from "express";
import {
  createScheduledMessage,
  getScheduledMessages
} from "../controller/message.js";
import { protectedRoute } from "../middleware/protectedRoute.js";

const router = express.Router();

router.use(protectedRoute);

router.post("/", createScheduledMessage);
router.get("/", getScheduledMessages);

export default router;
