import mongoose from "mongoose";
import { REGISTRATION_STATUS } from "../constants.js";

const regSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registeredAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: REGISTRATION_STATUS,
        default: "REGISTERED"
    },
    // ADD THIS FIELD FOR ATTENDANCE
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    attendanceStatus: {
        type: String,
        enum: ["PRESENT", "ABSENT"],
        default: "ABSENT"
    },

    // FOR FUTURE PAYMENTS
    paymentStatus: {
        type: String,
        enum: ["PENDING", "CONFIRMED", "FAILED"],
        default: "CONFIRMED"
    }
}, { timestamps: true });
// Compound index to ensure one user can't register twice for the same event
regSchema.index({ event: 1, user: 1 }, { unique: true });

const registrationModel = mongoose.models.Register || mongoose.model('Register', regSchema);

export default registrationModel;