import dotenv from "dotenv";
// import { app } from "./app.js";
import connnectDB from "./db/connect_db.js";

dotenv.config({
    path: "./.env"
});

const { app } = await import('./app.js');

connnectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("Error: ", error);
            throw (error);
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log("Server running at port: ", process.env.PORT);
        })
    })
    .catch((error) => {
        console.log("DB connection failed: ", error);
        process.exit(1);
    });