import { asyncHandler } from "../utils/asyncHandler.js";
import userModel from "../models/userModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import validator from "validator";
import eventModel from "../models/eventModel.js";
import fs from "fs";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { EVENT_CATEGORIES } from "../constants.js";
import registrationModel from "../models/registrationModel.js";
import crypto from "crypto";


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
    if (!EVENT_CATEGORIES.includes(eventCategory)) {
        throw new ApiError(401, `Invalid Category! Allowed values are: ${EVENT_CATEGORIES.join(", ")}`);
    }

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
    const threeMonthsLater = new Date(end);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

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
    if (fs.existsSync(coverLocalPath)) {
        fs.unlinkSync(coverLocalPath);
        //console.log('[CLOUD] deleted file:', localFilePath);
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
        createdBy: req.user._id,
        expireAt: threeMonthsLater
    });

    return res.status(201).json(
        new ApiResponse(201, newEvent, "Event created successfully")
    );
});

const cancelEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const eventDoc = await eventModel.findById(eventId);
    if (!eventDoc) throw new ApiError(400, "Event doesnt exists");
    eventDoc.isCancelled = true;
    await eventDoc.save();

    return res.status(200).json(new ApiResponse(200, eventDoc, "Event cancelled!"));

});
const deleteEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const eventDoc = await eventModel.findById(eventId);
    if (!eventDoc) throw new ApiError(400, "Event not found");
    const present = new Date();
    if (eventDoc.eventEndDateTime > present && eventDoc.eventStartDateTime <= present) {
        throw new ApiError(402, "You can't delete ongoing event");
    }
    eventDoc.isDeleted = true;
    // 2. OVERWRITE the expiry date to 10 days from NOW
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    eventDoc.expireAt = tenDaysFromNow;
    await eventDoc.save();
    return res.status(200).json(new ApiResponse(200, eventDoc, "Soft deleted, will be deleted permanently after 10 days"));
});

const getAllEvents = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        category,
        status: rawStatus = "UPCOMING" // Default to UPCOMING if nothing sent
    } = req.query;
    const status = rawStatus.toUpperCase();

    const matchStage = { isDeleted: false };
    const now = new Date();

    // Dynamic Sort Options
    let sortStage = { eventStartDateTime: 1 }; // Default: Ascending (soonest first)

    // --- 1. BUILD MATCH STAGE BASED ON STATUS ---
    // This replaces the old 'show' logic completely
    switch (status) {
        case 'UPCOMING':
            matchStage.eventStartDateTime = { $gt: now };
            matchStage.isCancelled = false;
            sortStage = { eventStartDateTime: 1 }; // Show soonest upcoming first
            break;

        case 'ONGOING':
            matchStage.eventStartDateTime = { $lte: now }; // Started in past
            matchStage.eventEndDateTime = { $gte: now };   // Ends in future
            matchStage.isCancelled = false;
            sortStage = { eventEndDateTime: 1 }; // Show those ending soonest first
            break;

        case 'COMPLETED':
            matchStage.eventEndDateTime = { $lt: now };
            matchStage.isCancelled = false;
            sortStage = { eventEndDateTime: -1 }; // Show most recently finished first
            break;

        case 'CANCELLED':
            matchStage.isCancelled = true;
            sortStage = { updatedAt: -1 }; // Show most recently cancelled first
            break;

        default:
            // Fallback: If someone sends invalid status, decide what to show.
            // Safe bet: Show all non-cancelled, non-deleted events?
            // Or just default to UPCOMING logic above.
            matchStage.isCancelled = false;
            break;
    }

    // --- 2. SEARCH FILTERS ---
    if (query) {
        matchStage.eventName = { $regex: query, $options: "i" };
    }

    if (category) {
        matchStage.eventCategory = { $regex: `^${category}$`, $options: "i" };
    }

    // --- 3. AGGREGATION PIPELINE ---
    const events = await eventModel.aggregate([
        // A. Filter first (Efficiency)
        { $match: matchStage },

        // B. Lookup Registrations (The "Costly" part, but fine for 10k users)
        {
            $lookup: {
                from: "registers",       // Ensure this matches your collection name exactly in MongoDB
                localField: "_id",
                foreignField: "event",
                as: "registrations"
            }
        },

        // C. Calculate Counts & isFull
        {
            $addFields: {
                participantsCount: { $size: "$registrations" },
                isFull: {
                    $cond: {
                        if: { $eq: ["$maxParticipants", 0] }, // If 0, Unlimited
                        then: false,
                        else: {
                            $gte: [{ $size: "$registrations" }, "$maxParticipants"]
                        }
                    }
                }
            }
        },

        // D. Cleanup (Remove heavy registration array)
        {
            $project: {
                registrations: 0
            }
        },

        // E. Sort & Pagination
        { $sort: sortStage },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
    ]);

    // --- 4. COUNT TOTAL (For Frontend Pagination) ---
    // We count based on the *Filter*, not the pipeline result
    const totalEvents = await eventModel.countDocuments(matchStage);

    return res.status(200).json(
        new ApiResponse(200, {
            events,
            meta: {
                total: totalEvents,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalEvents / limit)
            }
        }, "Events fetched successfully")
    );
});

const updateEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;

    // 1. Check if Event Exists FIRST
    const event = await eventModel.findById(eventId);
    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // 2. Identify what is being updated (Filter out undefined fields)
    const updates = {};
    const allowedFields = [
        "eventName", "description", "venue", "eventCategory",
        "eventStartDateTime", "eventEndDateTime",
        "registrationOpenDate", "registrationCloseDate",
        "registrationFee", "maxParticipants", "status"
    ];

    // Loop through allowed fields. If present in req.body, add to updates object.
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined && req.body[field] !== "") {
            updates[field] = req.body[field];
        }
    });

    // 3. Handle Image Separate Logic
    if (req.file) {
        const uploadResponse = await uploadOnCloudinary(req.file.path);
        if (!uploadResponse) {
            throw new ApiError(500, "Failed to upload new image");
        }
        updates.coverImage = uploadResponse.secure_url;
        // Optional: Add logic to delete old image here
    }

    // 4. CHECK: Is there anything to update?
    // If 'updates' object has 0 keys, user sent nothing.
    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, "No fields provided to update");
    }

    // 5. Special Validation Logic: Dates
    // If user is trying to update dates, we must ensure integrity
    // We mix 'updates' with 'event' (existing data) to check the final result
    if (updates.eventStartDateTime || updates.eventEndDateTime || updates.registrationOpenDate || updates.registrationCloseDate) {
        // 1. Merge existing data with updates to get the full picture
        const newStart = new Date(updates.eventStartDateTime || event.eventStartDateTime);
        const newEnd = new Date(updates.eventEndDateTime || event.eventEndDateTime);
        const newRegOpen = new Date(updates.registrationOpenDate || event.registrationOpenDate);
        const newRegClose = new Date(updates.registrationCloseDate || event.registrationCloseDate);

        // 2. Validate: Event Duration
        if (newEnd <= newStart) {
            throw new ApiError(400, "Event End time must be after Start time.");
        }

        // 3. Validate: Registration Duration
        if (newRegClose <= newRegOpen) {
            throw new ApiError(400, "Registration Close time must be after Open time.");
        }

        // 4. Validate: Registration vs Event Logic
        // CHANGE: Changed '<=' to '<' to allow reg to close exactly when event starts
        // OPTIONAL: If you allow onsite reg, remove this check entirely.
        if (newStart < newRegClose) {
            throw new ApiError(400, "Registration cannot close after the event has started.");
        }

        // 5. Validate: Registration shouldn't open after event ends (Sanity check)
        if (newRegOpen >= newEnd) {
            throw new ApiError(400, "Registration cannot open after the event has ended.");
        }
    }

    // 6. Perform the Update
    // Since 'updates' only contains changed fields, MongoDB only updates those.
    const updatedEvent = await eventModel.findByIdAndUpdate(
        eventId,
        { $set: updates },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedEvent, "Event updated successfully")
    );
});

const getEventById = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const eventDoc = await eventModel.findById(eventId);
    if (!eventDoc) throw new ApiError(400, "Event not found, either it never happend or its been more than 3 months!");
    return res.status(200).json(new ApiResponse(200, eventDoc, "Successfully fetched events"));
});

const registerForEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;

    // 1. Fetch Event
    const event = await eventModel.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    // 2. Sanity Checks: Cancelled or Deleted?
    if (event.isCancelled || event.isDeleted) {
        throw new ApiError(400, "Cannot register for a cancelled or deleted event.");
    }

    // 3. Date Checks
    const now = new Date();
    // Use the stored dates directly
    if (event.registrationCloseDate && now > event.registrationCloseDate) {
        throw new ApiError(400, "Registration for this event has closed.");
    }
    if (now >= event.eventStartDateTime) {
        throw new ApiError(400, "Event has already started.");
    }

    // 4. Duplicate Check (CRITICAL)
    // Check if this user is already registered for this specific event
    const existingRegistration = await registrationModel.findOne({
        event: eventId,
        user: userId
    });
    if (existingRegistration) {
        throw new ApiError(409, "You are already registered for this event.");
    }

    // 5. Max Participants Check (Capacity)
    // Only check if maxParticipants is > 0 (assuming 0 means unlimited)
    if (event.maxParticipants > 0 && event.participantsCount >= event.maxParticipants) {
        throw new ApiError(400, "Event is fully booked.");
    }

    // 6. Generate Unique Ticket ID (For Attendance)
    // Format: EV-UserLast4-RandomHex (e.g., EV-8A2B-9F22)
    const uniqueSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ticketId = `TICKET-${uniqueSuffix}`;

    // 7. Create Registration
    const registration = await registrationModel.create({
        event: eventId,
        user: userId,
        ticketId: ticketId,
        paymentStatus: event.price > 0 ? "PENDING" : "CONFIRMED", // Future proofing
        attendanceStatus: "ABSENT" // Default status
    });

    if (!registration) {
        throw new ApiError(500, "Something went wrong while registering.");
    }

    // 8. Increment Participant Count on Event (Atomic Update)
    // We use $inc to ensure accuracy even if 2 people register at the exact same millisecond
    await eventModel.findByIdAndUpdate(eventId, {
        $inc: { participantsCount: 1 }
    });

    return res.status(201).json(
        new ApiResponse(201, registration, "Registration successful.")
    );
});

export {
    loginChief,
    createEvent,
    getAllEvents,
    updateEvent,
    cancelEvent,
    deleteEvent,
    getEventById,
    registerForEvent
};