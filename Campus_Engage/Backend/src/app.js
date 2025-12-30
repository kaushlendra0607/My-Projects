import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRouter.js";
import eventRouter from "./routes/eventRouter.js";
import fs from "fs";
import chiefRouter from "./routes/chiefRouter.js";
import paymentRouter from "./routes/paymentRouter.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://campusengage.netlify.app/',
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
app.use('/api/event', eventRouter);
app.use('/api/chief/secure', chiefRouter);
app.use('/api/payments/', paymentRouter);
console.log("\nServer running on port: ", process.env.CORS_ORIGIN);
app.use(async (err, req, res, next) => {
    // Clean up uploaded files if present
    // 1. Collect all files (Single or Multiple)
    let filesToDelete = [];

    if (req.files) {
        // Handle upload.fields() or upload.array()
        filesToDelete = Object.values(req.files).flat();
    } else if (req.file) {
        // Handle upload.single()
        filesToDelete = [req.file];
    }

    // 2. Iterate and Delete
    if (filesToDelete.length > 0) {
        for (let file of filesToDelete) {
            try {
                // Check if file still exists before trying to delete (avoid double-delete errors)
                await fs.promises.access(file.path);
                await fs.promises.unlink(file.path);
                console.log("[ERROR CLEANUP] deleted:", file.path);
            } catch (e) {
                // If code is ENOENT, it means file was already deleted (good!)
                if (e.code !== 'ENOENT') {
                    console.log("[ERROR CLEANUP] failed:", file.path, e.message);
                }
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