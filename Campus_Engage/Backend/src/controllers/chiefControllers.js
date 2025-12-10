import { asyncHandler } from "../utils/asyncHandler.js";
import userModel from "../models/userModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import validator from "validator";


const loginChief = asyncHandler(async (req, res) => {
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

export { loginChief };