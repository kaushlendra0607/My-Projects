import express from "express";
import { getAllUsers } from "../controllers/chiefControllers.js";
import authUser from "../middlewares/authUser.js";
import { verifyRole } from "../middlewares/authRole.js";

const chiefRouter = express.Router();

chiefRouter.get('/users',authUser,verifyRole("ADMIN","CHIEF"),getAllUsers);

export default chiefRouter;