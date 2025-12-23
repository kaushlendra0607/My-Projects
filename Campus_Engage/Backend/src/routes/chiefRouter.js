import express from "express";
import {
    bulkDeleteGraduatedUsers,
    changeUserRole,
    deleteUser,
    getAllUsers,
    getUserProfile
} from "../controllers/chiefControllers.js";
import authUser from "../middlewares/authUser.js";
import { verifyRole } from "../middlewares/authRole.js";
import requirePasswordChange from "../middlewares/chiefPass.js";

const chiefRouter = express.Router();

chiefRouter.get('/users',authUser,
    verifyRole("ADMIN","CHIEF"),requirePasswordChange,getAllUsers);

chiefRouter.patch('/change-role',authUser,
    verifyRole("CHIEF"),requirePasswordChange,changeUserRole);

chiefRouter.delete('/delete-batch',authUser,
    verifyRole("CHIEF"),requirePasswordChange,bulkDeleteGraduatedUsers);

chiefRouter.delete('/delete-user/:userId',
    authUser,verifyRole("CHIEF"),requirePasswordChange,deleteUser);

chiefRouter.get('/u/:userId',authUser,
    verifyRole("ADMIN","CHIEF"),requirePasswordChange,getUserProfile);

export default chiefRouter;