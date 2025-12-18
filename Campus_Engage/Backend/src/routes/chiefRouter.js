import express from "express";
import { bulkDeleteGraduatedUsers, changeUserRole, deleteUser, getAllUsers } from "../controllers/chiefControllers.js";
import authUser from "../middlewares/authUser.js";
import { verifyRole } from "../middlewares/authRole.js";

const chiefRouter = express.Router();

chiefRouter.get('/users',authUser,verifyRole("ADMIN","CHIEF"),getAllUsers);

chiefRouter.patch('/change-role',authUser,verifyRole("CHIEF"),changeUserRole);

chiefRouter.delete('/delete-batch',authUser,verifyRole("CHIEF"),bulkDeleteGraduatedUsers);

chiefRouter.delete('/delete-user/:userId',authUser,verifyRole("CHIEF"),deleteUser);

export default chiefRouter;