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
        registrationFee: {
            type: Number,
            default: 0, // 0 means free
            min: [0,"Minimum value of fee can be zero."]
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
        isDeleted: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        isCancelled: {
            type: Boolean,
            default: false
        },
        expireAt: {
            type: Date,
            default: null, // If null, it won't be deleted
            index: { expires: 0 } // THIS IS THE MAGIC
        },
        canUserCancel:{
            type:Boolean,
            default:true,
            required:true
        }
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } } // Automatically adds createdAt and updatedAt
);

// THE MAGIC: A Virtual Field
// This calculates the status automatically every time you fetch the event
eventSchema.virtual('status').get(function () {
    const now = new Date();

    if (this.isCancelled) {
        return EVENT_STATUS.CANCELLED;
    }
    if (now < this.eventStartDateTime) {
        return EVENT_STATUS.UPCOMING;
    }
    if (now >= this.eventStartDateTime && now <= this.eventEndDateTime) {
        return EVENT_STATUS.ONGOING;
    }
    return EVENT_STATUS.COMPLETED;
});

const eventModel = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default eventModel;