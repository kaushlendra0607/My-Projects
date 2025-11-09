import { app } from "./app.js";
import connnectDB from "./db/connect_db.js";
import dotenv from "dotenv";

dotenv.config({
    path:"./.env"
});

connnectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Error: ",error);
        throw(error);
    });
    app.listen(process.env.PORT || 8000,()=>{
        console.log("Server running at port: ",process.env,PORT);
    })
})
.catch((error)=>{
    console.log("DB connection failed: ",error);
});