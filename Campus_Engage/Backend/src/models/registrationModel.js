import mongoose from "mongoose";
import { REGISTRATION_STATUS, PAYMENT_STATUS } from "../constants.js";

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
        enum: PAYMENT_STATUS,
        default: "PENDING"
    },
    certificateUrl: {
        type: String, // Cloudinary URL
        default: ""
    },
    // 2. Feedback (User provides this after event)
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String, maxlength: 500 }
    },
    canCancel:{
        type:Boolean,
        default:true
    }
}, { timestamps: true });
// Compound index to ensure one user can't register twice for the same event
regSchema.index({ event: 1, user: 1 }, { unique: true });

const registrationModel = mongoose.models.Register || mongoose.model('Register', regSchema);

export default registrationModel;