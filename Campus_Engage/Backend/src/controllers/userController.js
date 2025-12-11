import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import userModel from "../models/userModel.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import validator from "validator";
import fs, { access } from 'fs';

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
    if (password.length < 8) throw new ApiError(400, "Password must have atleast 8 characters!");

    const userExists = await userModel.findOne({ $or: [{ email }, { userName }] });
    if (userExists) {
        throw new ApiError(409, "User already exists!");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //console.log('[CTRL] request received:', {
    //     time: new Date().toISOString(),
    //     ip: req.ip,
    //     originalname: req.files?.avatar?.[0]?.originalname,
    //     path: avatarLocalPath,
    //     files: req.files
    // });
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required!");
    }

    const avatarLoad = await uploadOnCloudinary(avatarLocalPath);
    if (!avatarLoad) {
        throw new ApiError(400, "Couldn't upload avatar");
    }
    const userDoc = await userModel.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatarLoad.secure_url
    });
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
    const createdUser = await userModel.findById(userDoc._id);
    // fs.unlinkSync(avatarLocalPath);
    if (!createdUser) throw new ApiError(500, "Something went wrong, User not created");
    const refreshToken = createdUser.generateRefreshToken();
    const accessToken = createdUser.generateAccessToken();
    createdUser.refreshToken = refreshToken;
    await createdUser.save({ validateBeforeSave: false });
    return res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: {
                _id: createdUser._id,
                fullName: createdUser.fullName,
                email: createdUser.email,
                userName: createdUser.userName,
                avatar: createdUser.avatar
            },
            refreshToken,
            accessToken
        }, "User registered"));
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!validator.isEmail(email)) throw new ApiError(400, "Invalid mail!");
    const user = await userModel.findOne({ email });
    if (!user) throw new ApiError(404, "User does not exists!");
    const isPassword = await user.isPasswordCorrect(password);
    if (!isPassword) throw new ApiError(401, "Incorrect Password!");

    const refreshToken = await user.generateRefreshToken();
    const accessToken = await user.generateAccessToken();
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return res.status(200).cookie("refreshToken", refreshToken, options)
        .cookie("accesstoken", accessToken, options)
        .json(new ApiResponse(200, {
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                userName: user.userName,
                avatar: user.avatar,
                role: user.role,
                isDefaultPassword: user.isDefaultPassword
            },
            refreshToken,
            accessToken
        }, "Login successfull!"));
});

const logOutUser = asyncHandler(async (req, res) => {
    await userModel.findOneAndUpdate(
        { _id: req.user._id },
        {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
            //by doing new true db returns the updated document otherwise it will return
            //the old document
        }
    );
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
        //same site determines the security level of transfer os cookies among different sites
    }

    return res.status(200).clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out!"));
});

const updateUser = asyncHandler(async (req, res) => {
    const { fullName, userName, email } = req.body;
    if (!fullName && !userName && !email) throw new ApiError(400, "Atleast give one field to change");
    const userDoc = await userModel.findById(req.user._id).select("-password");
    // 4. DUPLICATE CHECK (Critical Step)
    // If they are changing email or username, check if it's taken by someone else
    if (email || userName) {
        const existingUser = await userModel.findOne({
            $or: [
                { email: email }, 
                { userName: userName }
            ],
            _id: { $ne: req.user._id } // Exclude the current user from check
        });

        if (existingUser) {
            throw new ApiError(409, "Email or Username already exists!");
        }
    }
    if (email && !validator.isEmail(email)) throw new ApiError(401, "Invalid mail");
    // 5. Dynamic Update Logic
    // We create a map of "Key Name" -> "New Value"
    const updates = { fullName, userName, email };
    // We iterate over the KEYS ("fullName", "email", etc.)
    Object.keys(updates).forEach((key) => {
        const newValue = updates[key];
        // Only update if:
        // A. The user sent a value (newValue exists)
        // B. The value is DIFFERENT from what is in DB
        if (newValue && newValue.trim() !== "" && newValue !== userDoc[key]) {
            userDoc[key] = newValue; // Bracket notation updates the correct field
        }
    });
    await userDoc.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200,{
        fullName: userDoc.fullName,
        email: userDoc.email,
        userName: userDoc.userName
    },"Details updated successfully"));
});

export { registerUser, loginUser, logOutUser, updateUser };