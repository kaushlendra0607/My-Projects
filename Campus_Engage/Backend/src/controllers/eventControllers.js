import { asyncHandler } from "../utils/asyncHandler.js";
import userModel from "../models/userModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import eventModel from "../models/eventModel.js";
import fs from "fs";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { EVENT_CATEGORIES } from "../constants.js";
import registrationModel from "../models/registrationModel.js";
import crypto from "crypto";
import paymentModel from "../models/paymentModel.js";
import { createRazorpayInstance } from "../utils/razorPayInstance.js";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";


const createEvent = asyncHandler(async (req, res) => {
    // 1. Extract File First (Image)
    // Assuming you use middleware like: upload.single("coverImage")
    const coverLocalPath = req.file?.path;

    // 2. Extract Body Data
    const {
        eventName,
        description,
        venue,
        eventStartDateTime,
        eventEndDateTime,
        registrationOpenDate,
        registrationCloseDate,
        canUserCancel: rawCancel,
        maxParticipants,
        eventCategory: rawCategory // 1. Extract it here with an alias
    } = req.body;

    const canUserCancel = rawCancel === "true";
    // 2. Process it safely
    let eventCategory;
    if (rawCategory) {
        eventCategory = String(rawCategory).trim().toUpperCase();
    }
    if (!EVENT_CATEGORIES.includes(eventCategory)) {
        throw new ApiError(401, `Invalid Category! Allowed values are: ${EVENT_CATEGORIES.join(", ")}`);
    }
    // 1. Validate Max Participants (Only if provided)
    if (maxParticipants !== undefined) {
        const val = Number(maxParticipants);
        if (isNaN(val) || val < 0) {
            throw new ApiError(400, "Max participants must be a valid number greater than 0.");
        }
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
    const retentionPeriod = new Date(end);
    retentionPeriod.setFullYear(retentionPeriod.getFullYear() + 5);

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
        expireAt: retentionPeriod,
        canUserCancel: canUserCancel,
        maxParticipants: maxParticipants,
        //mongoose handles this automatically for us
        //if frontend sends a value then it is used
        //if not then here it will be undefined but default value will be used
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
        throw new ApiError(400, "You can't delete ongoing event");
    }
    eventDoc.isDeleted = true;
    // 2. OVERWRITE the expiry date to 10 days from NOW
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    eventDoc.expireAt = tenDaysFromNow;
    await registrationModel.deleteMany({ event: eventId });
    await eventDoc.save();
    return res.status(200).json(new ApiResponse(200, eventDoc, "Soft deleted, will be deleted permanently after 10 days"));
});

const getAllEvents = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        category,
        minFee,
        maxFee,
        status: rawStatus = "UPCOMING"
    } = req.query;

    const status = rawStatus ? rawStatus.toUpperCase() : "UPCOMING";

    // 1. Initialize Match Stage
    const matchStage = {};
    const now = new Date();
    let sortStage = { eventStartDateTime: 1 };

    // --- 2. BUILD MATCH STAGE ---
    switch (status) {
        case 'UPCOMING':
            matchStage.eventStartDateTime = { $gt: now }; // Future Only
            matchStage.isCancelled = { $ne: true };       // Active Only
            matchStage.isDeleted = { $ne: true };         // Not Deleted
            sortStage = { eventStartDateTime: 1 };
            break;

        case 'ONGOING':
            matchStage.eventStartDateTime = { $lte: now }; // Started
            matchStage.eventEndDateTime = { $gte: now };   // Not ended
            matchStage.isCancelled = { $ne: true };
            matchStage.isDeleted = { $ne: true };
            sortStage = { eventEndDateTime: 1 };
            break;

        case 'COMPLETED':
            matchStage.eventEndDateTime = { $lt: now };    // Ended
            matchStage.isCancelled = { $ne: true };
            matchStage.isDeleted = { $ne: true };
            sortStage = { eventEndDateTime: -1 };
            break;

        case 'CANCELLED':
            matchStage.isCancelled = true;                 // Explicitly Cancelled
            matchStage.isDeleted = { $ne: true };
            sortStage = { updatedAt: -1 };
            break;

        case 'DELETED':
            matchStage.isDeleted = true;                   // Explicitly Deleted
            sortStage = { updatedAt: -1 };
            break;

        case 'ALL':
            // Show Everything (Past, Future, Ongoing) EXCEPT Deleted
            matchStage.isDeleted = { $ne: true };
            // Note: We do NOT filter by date here, so it shows everything history.
            // sortStage = { eventStartDateTime: -1 }; // Newest first
            sortStage = { createdAt: -1 }; // Newest first
            break;

        default:
            // Fallback: Show Upcoming
            matchStage.eventStartDateTime = { $gt: now };
            matchStage.isCancelled = { $ne: true };
            matchStage.isDeleted = { $ne: true };
            sortStage = { eventStartDateTime: 1 };
            break;
    }

    // --- 3. SEARCH & CATEGORY ---
    if (query) {
        matchStage.eventName = { $regex: query, $options: "i" };
    }

    if (category) {
        const cleanCat = String(category).trim().toUpperCase();
        matchStage.eventCategory = { $regex: `^${cleanCat}$`, $options: "i" };
    }

    // --- 4. FEE FILTER ---
    if (minFee || maxFee) {
        matchStage.registrationFee = {};
        if (minFee) matchStage.registrationFee.$gte = Number(minFee);
        if (maxFee) matchStage.registrationFee.$lte = Number(maxFee);
    }

    // --- 5. RUN PIPELINE ---
    const events = await eventModel.aggregate([
        { $match: matchStage },
        // ... Lookup logic ...
        {
            $lookup: {
                from: "registers",
                localField: "_id",
                foreignField: "event",
                as: "registrations"
            }
        },
        {
            $addFields: {
                participantsCount: { $size: "$registrations" },
                isFull: {
                    $cond: {
                        if: { $eq: ["$maxParticipants", 0] },
                        then: false,
                        else: { $gte: [{ $size: "$registrations" }, "$maxParticipants"] }
                    }
                }
            }
        },
        { $project: { registrations: 0 } },
        // ... End Lookup ...
        { $sort: sortStage },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
    ]);

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
        "registrationFee", "maxParticipants", "canUserCancel", "participantsCount"
    ];
    const now = new Date();
    // 24 hours * 60 mins * 60 secs * 1000 ms
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const cancelDeadline = new Date(event.eventStartDateTime.getTime() - ONE_DAY_MS);

    // Loop through allowed fields. If present in req.body, add to updates object.
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined && req.body[field] !== "") {
            if (field == "canUserCancel") {
                if (now >= cancelDeadline) {
                    throw new ApiError(400, "Can not change this now");
                }
            }
            updates[field] = req.body[field];
        }
    });
    if (updates.maxParticipants !== undefined) {
        // Ensure new limit is not less than current registrations
        const val = Number(maxParticipants);
        if (isNaN(val) || val <= 0) {
            throw new ApiError(400, "Max participants must be a valid number greater than 0.");
        }
        else if (updates.maxParticipants < event.participantsCount) {
            throw new ApiError(400,
                `Cannot lower capacity to ${updates.maxParticipants}. You already have ${event.participantsCount} participants registered.`
            );
        }
    }
    if (updates.participantsCount !== undefined) {
        const val = Number(participantsCount);
        if (isNaN(val) || val <= 0) {
            throw new ApiError(400, "Participant`s count must be a valid number greater than 0.");
        }
    }

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
        if (newEnd <= newRegClose) throw new ApiError(400, "Registration can't close after event ends");
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

    // ============================================================
    // 🛑 OLD LOGIC PRESERVED (Steps 1-5) - DO NOT TOUCH
    // ============================================================

    // 1. Fetch Event
    const event = await eventModel.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    // 2. Sanity Checks
    if (event.isCancelled || event.isDeleted) {
        throw new ApiError(400, "Cannot register for a cancelled or deleted event.");
    }

    // 3. Date Checks
    const now = new Date();
    if (now <= event.registrationOpenDate) throw new ApiError(400, `Registration not started yet. Opens on ${event.registrationOpenDate.toDateString()}`);
    if (event.registrationCloseDate && now > event.registrationCloseDate) {
        throw new ApiError(400, "Registration for this event has closed.");
    }
    if (now >= event.eventStartDateTime) {
        throw new ApiError(400, "Event has already started.");
    }

    // 4. Duplicate Check
    const existingRegistration = await registrationModel.findOne({
        event: eventId,
        user: userId
    });
    if (existingRegistration) {
        throw new ApiError(409, "You are already registered for this event.");
    }

    // 5. Max Participants Check
    if (event.maxParticipants > 0 && event.participantsCount >= event.maxParticipants) {
        throw new ApiError(400, "Event is fully booked.");
    }

    // ============================================================
    // 🚀 NEW INDUSTRIAL LOGIC (Split: Paid vs Free)
    // ============================================================

    // Common Step: Generate Ticket ID (Needed for both)
    const uniqueSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ticketId = `TICKET-${uniqueSuffix}`;

    // ------------------------------------------
    // CASE A: PAID EVENT (Layer 1: Payment Intent)
    // ------------------------------------------
    if (event.registrationFee > 0) {

        // 1. Create Razorpay Order
        const options = {
            amount: event.registrationFee * 100, // Convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}` // Fixed spelling
        };

        let placedOrder;
        try {
            const razorPayInstance = await createRazorpayInstance();
            placedOrder = await razorPayInstance.orders.create(options);
        } catch (error) {
            console.error("Razorpay Error: ", error);
            throw new ApiError(500, "Payment gateway initialization failed.");
        }

        // 2. Save Payment Intent (PENDING)
        // We do NOT create a Registration doc yet. We do NOT increment count yet.
        const newPayment = await paymentModel.create({
            userId: userId,
            eventId: eventId,
            ticket_id: ticketId, // Saved here temporarily
            razorpay_order_id: placedOrder.id,
            amount: event.registrationFee * 100,
            status: "PENDING"
        });

        // 3. Return Order ID to Frontend
        return res.status(200).json(
            new ApiResponse(200, {
                orderId: placedOrder.id,
                amount: event.registrationFee,
                currency: "INR"
            }, "Order created. Proceed to payment.")
        );
    }

    // ------------------------------------------
    // CASE B: FREE EVENT (Instant Registration)
    // ------------------------------------------
    else {
        // 1. Create Registration Directly
        const registration = await registrationModel.create({
            event: eventId,
            user: userId,
            ticketId: ticketId,
            paymentStatus: "CONFIRMED", // It's free
            attendanceStatus: "ABSENT"
        });

        if (!registration) {
            throw new ApiError(500, "Something went wrong while registering.");
        }

        // 2. Increment Participant Count (Only for Free events right now)
        await eventModel.findByIdAndUpdate(eventId, {
            $inc: { participantsCount: 1 }
        });

        return res.status(201).json(
            new ApiResponse(201, registration, "Registration successful.")
        );
    }
});

const cancelRegistration = asyncHandler(async (req, res) => {
    // We expect eventId in params. 
    // userId is OPTIONAL in params (used only if Admin is cancelling someone else)
    const { eventId, userId: targetUserId } = req.params;
    const requestingUser = req.user; // From auth middleware

    // 1. Determine who is being cancelled
    let userToCancelId;

    if (requestingUser.role === "ADMIN" || requestingUser.role === "CHIEF") {
        // If Admin, they MUST provide the targetUserId in params
        if (!targetUserId) throw new ApiError(400, "Admin must provide userId to cancel.");
        userToCancelId = targetUserId;
    } else {
        // If Regular User, they can ONLY cancel themselves
        userToCancelId = requestingUser._id;
    }

    // 2. Find the Registration
    const regDoc = await registrationModel.findOne({
        event: eventId,
        user: userToCancelId
    });

    if (!regDoc) throw new ApiError(404, "Registration not found.");
    if (regDoc.canCancel === false) {
        throw new ApiError(400, "Can not cancel this registration once registered!");
    }

    // 3. Check Event Status
    const eventDoc = await eventModel.findById(eventId);
    if (!eventDoc) throw new ApiError(404, "Event not found.");
    if (eventDoc.canUserCancel === false) {
        throw new ApiError(400, "Once registered can not cancel for this event.");
    }

    // Rule: Cannot cancel if event already started (or maybe 24h before?)
    const now = new Date();
    // 24 hours * 60 mins * 60 secs * 1000 ms
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const cancelDeadline = new Date(eventDoc.eventStartDateTime.getTime() - ONE_DAY_MS);
    if (now >= cancelDeadline) {
        throw new ApiError(400, "Cannot cancel. The event has already started.");
    }

    // 4. Prevent Double Cancellation
    if (regDoc.status === "CANCELLED") {
        throw new ApiError(400, "Registration is already cancelled.");
    }

    // 5. PERFORM CANCELLATION
    regDoc.status = "CANCELLED";

    // --- PAYMENT HANDLING ---
    // If they paid, we mark it for refund.
    // In a real app, you would trigger the Stripe/Razorpay Refund API here.
    if (regDoc.paymentStatus === "CONFIRMED") {
        regDoc.paymentStatus = "REFUNDED"; // or "REFUND_INITIATED"
    } else {
        regDoc.paymentStatus = "CANCELLED"; // If it was PENDING
    }

    //todo=> in future attach the refund payment logic when a user cancels registration
    await regDoc.save();

    // 6. FREE UP THE SEAT (Decrement Participant Count)
    // Only decrement if the event wasn't unlimited (optional, but good practice)
    await eventModel.findByIdAndUpdate(eventId, {
        $inc: { participantsCount: -1 }
    });

    return res.status(200).json(
        new ApiResponse(200, regDoc, "Registration cancelled successfully.")
    );
});

const getUserRegistrations = asyncHandler(async (req, res) => {
    // 1. Get IDs
    const targetUserId = req.params.userId; // The ID in the URL
    const requestingUserId = req.user._id;  // The Logged-in User

    // 2. Fetch the Requester's Details (to check Role)
    const requestingUserDoc = await userModel.findById(requestingUserId);
    if (!requestingUserDoc) throw new ApiError(401, "Invalid User.");

    // 3. SECURITY CHECK: Authorization Gate
    // Allow if: (User is asking for themselves) OR (User is Admin/Chief)
    // Note: We use .toString() because one might be an Object and the other a String
    const isSelf = requestingUserId.toString() === targetUserId;
    const isAdmin = requestingUserDoc.role === "ADMIN" || requestingUserDoc.role === "CHIEF";

    if (!isSelf && !isAdmin) {
        throw new ApiError(403, "Access Denied. You cannot view another user's registrations.");
    }
    // 2. Find ALL registrations for this user
    // .find() returns an Array []
    // .populate("event") magically replaces the 'event' ID with the actual Event Object
    const registrations = await registrationModel.find({ user: targetUserId })
        .populate("event");
    //populate will return all the object data where field will be event which we gave in schema of registration

    // 3. Validation (Optional: Check if empty)
    if (!registrations || registrations.length === 0) {
        // It's not really an error, just an empty list. Return empty array.
        return res.status(200).json(new ApiResponse(200, [], "No registrations found."));
    }

    // 4. Send it back
    return res.status(200).json(
        new ApiResponse(200, registrations, "User registrations fetched successfully")
    );
});

const getEventparticipants = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const reqUser = req.user._id;
    const eventDoc = await eventModel.findOne({ _id: eventId });
    if (!eventDoc) throw new ApiError(400, "No such event found.");
    const reqDoc = await userModel.findById(reqUser);
    if (!reqDoc) throw new ApiError(400, "Invalid request for participants.");
    if (reqDoc.role !== "ADMIN" && reqDoc.role !== "CHIEF") {
        throw new ApiError(400, "You are not allowed for this data access.");
    }
    // 3. Find Participants
    // PRO TIP: Populate only name/email. Don't send the user's password or version key!
    const registrations = await registrationModel.find({ event: eventId })
        .populate("user", "username email fullName avatar");
    if (!registrations || registrations.length == 0) {
        throw new ApiError(400, "No such registration found at all.");
    }
    return res.status(200).json(new ApiResponse(200, registrations, "Fetch Successfull."));
});

const markAttendance = asyncHandler(async (req, res) => {
    // 1. Input: Expect the Custom Ticket ID (e.g., "TICKET-A1B2")
    const { ticketId } = req.body;
    const reqUser = req.user._id;

    // 2. Authorize the Organizer
    const organizer = await userModel.findById(reqUser);
    if (!organizer || (organizer.role !== "ADMIN" && organizer.role !== "CHIEF")) {
        throw new ApiError(403, "Access Denied. Only organizers can mark attendance.");
    }

    // 3. Find Ticket using 'findOne' and your custom field
    const registration = await registrationModel.findOne({ ticketId: ticketId })
        .populate("user", "fullName email");
    if (!registration) {
        throw new ApiError(404, `Invalid Ticket. No registration found with ID: ${ticketId}`);
    }

    // 4. Logic Gate: Check Payment Status
    if (registration.paymentStatus !== "CONFIRMED") {
        throw new ApiError(400, `Cannot check in. Payment status is ${registration.paymentStatus}.`);
    }

    // 5. Logic Gate: Check Attendance (Using your Enum)
    if (registration.attendanceStatus === "PRESENT") {
        throw new ApiError(409, `User ${registration.user.fullName} has ALREADY checked in.`);
    }

    // 6. Mark Present
    registration.attendanceStatus = "PRESENT";
    registration.checkInTime = new Date();
    await registration.save();

    return res.status(200).json(
        new ApiResponse(200, registration, `Welcome, ${registration.user.fullName}! Check-in successful.`)
    );
});


const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const userId = req.user._id;

    // 1. Find the Pending Payment Document
    // We use razorpay_order_id to find the exact transaction we created earlier
    const tempPayment = await paymentModel.findOne({
        razorpay_order_id: razorpay_order_id,
        userId: userId
    });

    if (!tempPayment) {
        throw new ApiError(404, "Payment record not found.");
    }

    // 2. Idempotency Check (Double Payment Prevention)
    // If frontend sends the same request twice, don't register twice!
    if (tempPayment.status === "CONFIRMED") {
        return res.status(200).json(new ApiResponse(200, {}, "Payment already verified."));
    }

    // 3. Verify Signature (The Built-in Way) 🔐
    const secret = process.env.RAZOR_KEY_SECRET;

    const isValidSignature = validatePaymentVerification(
        { "order_id": razorpay_order_id, "payment_id": razorpay_payment_id },
        razorpay_signature,
        secret
    );

    if (!isValidSignature) {
        // Log this security breach attempt!
        tempPayment.status = "FAILED";
        await tempPayment.save();
        throw new ApiError(400, "Invalid payment signature. Potential fraud attempt.");
    }

    // 4. Update Payment Status (Success)
    tempPayment.status = "CONFIRMED";
    tempPayment.razorpay_payment_id = razorpay_payment_id;
    tempPayment.razorpay_signature = razorpay_signature;
    await tempPayment.save();

    // 5. Create the Final Registration
    // We retrieve the ticketId and eventId from the temporary payment doc
    const registration = await registrationModel.create({
        event: tempPayment.eventId,
        user: userId,
        ticketId: tempPayment.ticket_id, // Reuse the ticket ID we generated earlier
        paymentStatus: "CONFIRMED",
        attendanceStatus: "ABSENT"
    });
    if (!registration) {
        throw new ApiError(500, "Something went wrong while registering. Contact admin to fix issue if payment has been deducted.");
    }

    // 6. Update Event Stats (Increment Participants)
    await eventModel.findByIdAndUpdate(tempPayment.eventId, {
        $inc: { participantsCount: 1 }
    });

    return res.status(200).json(
        new ApiResponse(200, registration, "Payment verified and Registration successful!")
    );
});

// Get all payments for the logged-in user
const getPaymentHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const reqUser = req.user._id;
    let targetUser = userId || reqUser;

    const payments = await paymentModel.find({ userId: targetUser })
        .populate("eventId", "title eventStartDateTime venue") // Join with Event to show details
        .sort({ createdAt: -1 }); // Newest first

    if (!payments) {
        return res.status(200).json(new ApiResponse(200, [], "No payment history found"));
    }

    return res.status(200).json(
        new ApiResponse(200, payments, "Payment history fetched successfully")
    );
});

export {
    createEvent,
    getAllEvents,
    updateEvent,
    cancelEvent,
    deleteEvent,
    getEventById,
    registerForEvent,
    cancelRegistration,
    verifyPayment,
    getUserRegistrations,
    getEventparticipants,
    markAttendance,
    getPaymentHistory
};