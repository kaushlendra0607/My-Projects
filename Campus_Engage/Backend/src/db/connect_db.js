import mongoose from 'mongoose';
import {DB_NAME} from "../constants.js";

const connnectDB = async()=>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("DB CONNECTED");
        console.log(`\nConnection host:${connectionInstance.connection.host}`);
    }catch(error){
        console.log("Connecting mongoDB error: ",error);
        process.exit(1);
    }
}
//process.exit([code]) immediately ends the running Node.js process — no further code runs after it
export default connnectDB;