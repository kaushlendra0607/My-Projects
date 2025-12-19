import express from "express";
import authUser from "../middlewares/authUser.js";
import { getPaymentHistory, verifyPayment } from "../controllers/eventControllers.js";
import { verifyRole } from "../middlewares/authRole.js";
import requirePasswordChange from "../middlewares/chiefPass.js";

const paymentRouter = express.Router();

paymentRouter.post('/verify',authUser,verifyPayment);

paymentRouter.get('/history',authUser,getPaymentHistory);
paymentRouter.get('/history/:userId',
    authUser,verifyRole("ADMIN","CHIEF"),
    requirePasswordChange,getPaymentHistory);

export default paymentRouter;