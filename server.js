import "dotenv/config";
import express from "express";
// import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";

const app = express();

/*
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.disable("x-powered-by");
app.use(cors({
    origin: allowedOrigin,
    credentials: true
}));
*/

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended : true})); // Middleware to parse URL-encoded bodies
app.use(cookieParser()); // Middleware to parse cookies (req.cookies.jwt)

/*
app.get("/api/health", (_req, res) => {
    return res.status(200).json({
        success: true,
        message: "Server is healthy"
    });
});
*/

app.use("/api/auth", authRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
