import { asyncHandler } from "../utils/asyncHandler.js";
import userModel from "../models/userModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import validator from "validator";
import eventModel from "../models/eventModel.js";
import fs from "fs";
import uploadOnCloudinary from "../utils/cloudinary";


const loginChief = asyncHandler(async (req, res) => {
    //we created this controller without paying attention to the fact that/*
    // only difference in user and chief is of role
    // so this controller is not being used */
    const { email, password } = req.body;
    if (!validator.isEmail(email)) throw new ApiError(401, "Invalid mail!");
    const userDoc = await userModel.findOne({ email });
    if (!userDoc) throw new ApiError(400, "Chief not seeded in Data Base!");
    // FIX 3: SECURITY CHECK - Is this actually a Chief?
    if (userDoc.role !== "CHIEF") {
        throw new ApiError(403, "Access Denied: You are not authorized to login here.");
    }
    const correctPass = await userDoc.isPasswordCorrect(password);
    if (!correctPass) throw new ApiError(401, "Invalid Password!");
    const refreshToken = await userDoc.generateRefreshToken();
    const accessToken = await userDoc.generateaccessToken();
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
    userDoc.refreshToken = refreshToken;
    await userDoc.save({ validateBeforeSave: false });
    return res.status(200).cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(new ApiResponse(200, {
            user: {
                _id: userDoc._id,
                fullName: userDoc.fullName,
                email: userDoc.email,
                userName: userDoc.userName,
                avatar: userDoc.avatar,
                role: userDoc.role
            },
            refreshToken,
            accessToken
        }, "Login successfull!"));
});

const createEvent = asyncHandler(async (req, res) => {
    // 1. Extract File First (Image)
    // Assuming you use middleware like: upload.single("coverImage")
    const coverLocalPath = req.file?.path;

    // 2. Extract Body Data
    const {
        eventName,
        description,
        venue,
        eventCategory,
        eventStartDateTime,
        eventEndDateTime,
        registrationOpenDate,
        registrationCloseDate
    } = req.body;

    // 3. Validation: Check empty fields
    // We create an object so we can check the KEY name for the error message
    const fieldsToCheck = {
        eventName, description, venue, eventCategory,
        eventStartDateTime, eventEndDateTime,
        registrationOpenDate, registrationCloseDate
    };

    // Loop through keys to find the missing one
    for (const [key, value] of Object.entries(fieldsToCheck)) {
        if (!value || value.trim() === "") {
            // Delete the uploaded file if validation fails (Clean up!)
            if (coverLocalPath) fs.unlinkSync(coverLocalPath);
            throw new ApiError(400, `Field '${key}' is required!`);
        }
    }

    if (!coverLocalPath) {
        throw new ApiError(400, "Cover Image is required!");
    }

    // 4. Convert Strings to Date Objects (Standardize)
    const start = new Date(eventStartDateTime);
    const end = new Date(eventEndDateTime);
    const regOpen = new Date(registrationOpenDate);
    const regClose = new Date(registrationCloseDate);
    const now = new Date();
    /* not using date.now here bcz it doesnt gives us object
    Get current time as Date object for comparison*/

    // 5. Logical Date Validation
    if (end <= start) throw new ApiError(400, "Event cannot end before it starts!");
    if (regClose <= regOpen) throw new ApiError(400, "Registration cannot close before it opens!");
    if (start <= regClose) throw new ApiError(400, "Event cannot start before registration closes!");

    // Optional: Prevent past dates
    if (start < now) throw new ApiError(400, "Cannot schedule events in the past!");

    // 6. Upload Image to Cloudinary
    // (Import your upload function)
    const coverImageUpload = await uploadOnCloudinary(coverLocalPath);
    if (!coverImageUpload) throw new ApiError(500, "Failed to upload cover image");

    // --- RULE 1: NAME CHECK ---
    const duplicateNameEvent = await eventModel.findOne({
        eventName: { $regex: new RegExp(`^${eventName.trim()}$`, "i") },
        eventEndDateTime: { $gt: now }
    });

    if (duplicateNameEvent) {
        throw new ApiError(409, `An active event named '${eventName}' already exists.`);
    }

    // --- RULE 2: CATEGORY TIME CLASH ---
    const categoryClashEvent = await eventModel.findOne({
        eventCategory: eventCategory,
        $or: [
            {
                eventStartDateTime: { $lt: end },
                eventEndDateTime: { $gt: start }
            }
        ]
    });

    if (categoryClashEvent) {
        throw new ApiError(409, `Time Conflict: Another '${eventCategory}' event is scheduled.`);
    }

    // 7. Create Event
    const newEvent = await eventModel.create({
        eventName,
        description,
        venue,
        eventCategory,
        eventStartDateTime: start,
        eventEndDateTime: end,
        registrationOpenDate: regOpen,
        registrationCloseDate: regClose,
        coverImage: coverImageUpload.secure_url,// Use the Cloudinary URL
        // If you are tracking who created it:
        createdBy: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, newEvent, "Event created successfully")
    );
});

export { loginChief, createEvent };