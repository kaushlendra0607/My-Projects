import { Router } from "express";
import { registerUser } from "../controllers/userController.js";
import { upload } from "../middlewares/multerMiddle.js";

const userRouter = Router();

userRouter.post(
    '/register',
    upload.fields([
        {name:"avatar",
        maxCount:1}
    ]),
    registerUser
);

export default userRouter;