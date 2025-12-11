import mongoose from "mongoose";
import { EVENT_CATEGORIES, EVENT_STATUS } from "../constants.js";

const eventSchema = new mongoose.Schema(
    {
        eventName: {
            type: String,
            required: true,
            trim: true,
            index: true, // 1. Indexing here for Search
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        venue: {
            type: String,
            required: true,
            trim: true,
        },
        coverImage: {
            type: String, // Cloudinary URL
            required: true,
        },
        // 2. Syntax for Fixed Categories (Enum)
        eventCategory: {
            type: String,
            enum: EVENT_CATEGORIES,
            required: true,
            index: true, // 3. Indexing here for Filtering
        },
        // 4. Better Date Management
        eventStartDateTime: {
            type: Date,
            required: true,
            index: true, // 5. Indexing here for Sorting (Upcoming events)
        },
        eventEndDateTime: {
            type: Date,
            required: true,
        },
        registrationOpenDate: {
            type: Date,
            required: true,
        },
        registrationCloseDate: {
            type: Date,
            required: true,
        },
        // 6. Additional "Smart" Fields
        price: {
            type: Number,
            default: 0, // 0 means free
        },
        maxParticipants: {
            type: Number,
            default: 0, // Avoids unlimited registration crashes
        },
        participantsCount: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true // Admin can draft events without showing them
        },
        // 1. TRACKING STATUS (The History Logic)
        status: {
            type: String,
            enum: EVENT_STATUS,
            default: "UPCOMING"
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt
);

const eventModel = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default eventModel;