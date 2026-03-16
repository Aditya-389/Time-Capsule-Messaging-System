import "dotenv/config";
import express from "express";
// import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import {
    startMessageDeliveryWorker,
    stopMessageDeliveryWorker
} from "./services/message.service.js";

const app = express();


app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended : true})); // Middleware to parse URL-encoded bodies
app.use(cookieParser()); // Middleware to parse cookies (req.cookies.jwt)


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

await startMessageDeliveryWorker();

const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    await stopMessageDeliveryWorker();
    process.exit(0);
};

process.on("SIGINT", () => { 
    shutdown("SIGINT");
});

process.on("SIGTERM", () => { 
    shutdown("SIGTERM");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
