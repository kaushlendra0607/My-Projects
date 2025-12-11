import { Router } from "express";
import { changePassword, loginUser, logOutUser, registerUser, updateUser } from "../controllers/userController.js";
import { upload } from "../middlewares/multerMiddle.js";
import authUser from "../middlewares/authUser.js";
import changePass from "../middlewares/chiefPass.js";

const userRouter = Router();

userRouter.post(
    '/register',
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    registerUser
);
userRouter.post('/login', loginUser);
userRouter.post('/logout', authUser, logOutUser);
userRouter.route('/update-account').patch(authUser,updateUser);
userRouter.post('/change-password',authUser,changePassword);

export default userRouter;