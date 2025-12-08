import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import userModel from "../models/userModel.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import validator from "validator";
import fs from 'fs';

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, userName, password, avatar } = req.body;
    if (
        [fullName, email, userName, password, avatar].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Not a valid mail id");
    }

    const userExists = await userModel.findOne({ $or: [{ email }, { userName }] });
    if (userExists) {
        throw new ApiError(409, "User already exists!");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required!");
    }

    const avatarLoad = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Couldn't upload avatar");
    }
    const userDoc = await userModel.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatarLoad.secure_url
    });
    const createdUser = await userModel.findById(userDoc._id).select("-password -refreshToken");
    fs.unlinkSync(avatarLocalPath);
    if (!createdUser) throw new ApiError(500, "Something went wrong, User not created");
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered"));
});

export { registerUser };