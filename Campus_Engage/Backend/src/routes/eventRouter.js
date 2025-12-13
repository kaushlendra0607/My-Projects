import express from "express";
import authUser from "../middlewares/authUser.js";
import { verifyRole } from "../middlewares/authRole.js";
import requirePasswordChange from "../middlewares/chiefPass.js";
import { upload } from "../middlewares/multerMiddle.js";
import { cancelEvent, cancelRegistration, createEvent, deleteEvent, getAllEvents, getEventById, registerForEvent, updateEvent } from "../controllers/chiefControllers.js";

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


eventRouter.route('/:eventId').patch(
    authUser,
    verifyRole("ADMIN","CHIEF"),
    requirePasswordChange,
    upload.single("coverImage"),
    updateEvent
).get(getEventById);


eventRouter.patch(
    '/cancel/:eventId',
    authUser,
    verifyRole("ADMIN","CHIEF"),
    requirePasswordChange,
    cancelEvent
);


eventRouter.patch(
    '/delete/:eventId',
    authUser,
    verifyRole("ADMIN","CHIEF"),
    requirePasswordChange,
    deleteEvent
);

eventRouter.post('/:eventId/register',authUser,registerForEvent);

eventRouter.patch('/:eventId/cancel-registration',authUser,cancelRegistration);
eventRouter.patch('/:eventId/cancel-registration/:userId',authUser,cancelRegistration);

export default eventRouter;