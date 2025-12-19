import razorpay from "razorpay";

export const createRazorpayInstance = async () => {
    return new razorpay({
        key_id: process.env.RAZOR_API_KEY,
        key_secret: process.env.RAZOR_KEY_SECRET
    });
}