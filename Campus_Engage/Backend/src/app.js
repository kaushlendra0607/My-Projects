import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRouter.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
//In short: extended: true allows you to post "nested" objects.
//used for parsing HTML form submissions (URL-encoded data).
app.use(express.json({ limit: '16kb' }));
app.use(express.static("public"));
//This tells Express to serve static files (like HTML, CSS, JS, images) from a specific folder — here, "public".
app.use(cookieParser());

app.use("/api/users", userRouter);
console.log("\nServer running on port: ", process.env.CORS_ORIGIN);
app.use(async (err, req, res, next) => {
    // Clean up uploaded files if present
    if (req.files) {
        const filesArray = Object.values(req.files).flat();
        for (let file of filesArray) {
            try {
                await fs.promises.unlink(file.path);
                console.log("[ERROR CLEANUP] deleted:", file.path);
            } catch (e) {
                console.log("[ERROR CLEANUP] failed:", file.path, e.message);
            }
        }
    }

    // Send response
    const status = err.statusCode || 500;

    console.error("ERROR:", err);

    res.status(status).json({
        success: false,
        message: err.message,
        errors: err.errors || null,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

export { app };