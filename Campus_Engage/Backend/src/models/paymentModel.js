import mongoose from "mongoose";
import { PAYMENT_STATUS } from "../constants.js";
const paymentSchema = new mongoose.Schema({
    // Link to other models
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },

    // Razorpay Data
    razorpay_order_id: { type: String, required: true },
    ticket_id: { type: String, unique: true, required: true },
    razorpay_payment_id: { type: String }, // Filled after success
    razorpay_signature: { type: String },

    // Money Logic
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    // Status
    status: {
        type: String,
        enum: PAYMENT_STATUS,
        default: "PENDING"
    },

    // 🛑 NEW FIELDS FOR REFUNDS (Add these now!)
    refundId: { type: String }, // Razorpay Refund ID (rfnd_12345)
    amountRefunded: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ["PROCESSED", "PENDING"] }, // "PROCESSED" or "PENDING"
}, { timestamps: true });

const paymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default paymentModel;