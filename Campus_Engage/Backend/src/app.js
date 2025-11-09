import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/routes";

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.urlencoded({extended:true,limit:"16kb"}));
//used for parsing HTML form submissions (URL-encoded data).
app.use(express.json({limit:'16kb'}));
app.use(express.static("public"));
//This tells Express to serve static files (like HTML, CSS, JS, images) from a specific folder — here, "public".
app.use(cookieParser());

app.use("/api/v1/users",userRouter);
console.log("\nServer running on port: ",process.env.CORS_ORIGIN);

export { app };