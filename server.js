import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";

const app = express();


app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended : true})); // Middleware to parse URL-encoded bodies
app.use(cookieParser()); // Middleware to parse cookies (req.cookies.jwt)


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
