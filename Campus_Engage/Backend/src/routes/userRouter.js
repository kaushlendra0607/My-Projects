import { Router } from "express";
import { loginUser, registerUser } from "../controllers/userController.js";
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
userRouter.post('/login',loginUser);

export default userRouter;