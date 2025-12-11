import express from "express";
import authUser from "../middlewares/authUser.js";
import { verifyRole } from "../middlewares/authRole.js";
import requirePasswordChange from "../middlewares/chiefPass.js";
import { upload } from "../middlewares/multerMiddle.js";
import { createEvent, getAllEvents, updateEvent } from "../controllers/chiefControllers.js";

const eventRouter = express.Router();

eventRouter.post(
    '/create-event',
    authUser,
    verifyRole("ADMIN","CHIEF"),
    requirePasswordChange,
    upload.single("coverImage"),
    createEvent
);
eventRouter.get('/',getAllEvents);
eventRouter.patch(
    '/:eventId',
    authUser,
    verifyRole("ADMIN","CHIEF"),
    requirePasswordChange,
    upload.single("coverImage"),
    updateEvent
)

export default eventRouter;