import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import userModel from "../models/userModel.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import validator from "validator";
import jwt from "jsonwebtoken";
import fs, { access } from 'fs';

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, userName, password, batch, role = "USER" } = req.body;
    if (
        [fullName, email, userName, password].some((field) => field?.trim() === "")
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
    let avatarLocalPath;
    if (req.files && req.files.avatar && req.files.avatar.length > 0) {
        avatarLocalPath = req.files?.avatar[0]?.path;
    }
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
    if (!batch) throw new ApiError(400, "Btach start year is required!");
    const currentYear = new Date().getFullYear();
    if (batch < currentYear - 3) throw new ApiError(400, "Batch year can not be previous than 3 year.");
    if (batch > currentYear) throw new ApiError(400, "Batch year can not be in future.");
    let expireDate = new Date();
    expireDate.setFullYear(batch + 4);
    expireDate.setMonth(10);
    expireDate.setDate(1);
    if (role !== "USER") expireDate = null;
    const userDoc = await userModel.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatarLoad.secure_url,
        batch,
        expireAt: expireDate
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
    return res.status(200).json(new ApiResponse(200, {
        fullName: userDoc.fullName,
        email: userDoc.email,
        userName: userDoc.userName
    }, "Details updated successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old and new passwords are required");
    }
    // 2. Find User via Token (Secure)
    // We assume 'authUser' middleware has run
    const user = await userModel.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    // 3. Verify Old Password (Using Schema Method)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password");
    }
    if (oldPassword === newPassword) {
        throw new ApiError(400, "New password cannot be same as old password");
    }
    // 5. Update Password
    // The pre("save") hook in your schema will automatically HASH this!
    user.password = newPassword;

    // Fix for Chiefs: If they had a default password, it's no longer default
    if (user.isDefaultPassword) {
        user.isDefaultPassword = false;
    }
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, {}, "Password canged successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.user._id);
    if (!user) throw new ApiError(401, "User not found");
    // 1. Check for File (Use req.file for single uploads)
    let avatarLocalPath;
    if (req.file && req.file.path) {
        avatarLocalPath = req.file.path;
    }
    if (!avatarLocalPath) throw new ApiError(400, "No file path found");
    const avatarLoad = await uploadOnCloudinary(avatarLocalPath);
    if (!avatarLoad) throw new ApiError(501, "Couldn't upload avatar");
    user.avatar = avatarLoad.secure_url;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, user, "Avatar Updated"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // 1. Get the Refresh Token from Cookies (Secure) or Body (Fallback)
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request. No refresh token found.");
    }

    try {
        // 2. Verify the Token
        // This checks if the token is valid and not expired
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        // 3. Find the User
        // We look up the user by the ID inside the token
        const user = await userModel.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token. User not found.");
        }

        // 4. Security Check: Token Matching
        // Does the token in the cookie match the one saved in the Database?
        // This prevents "Token Reuse" attacks.
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used.");
        }

        // 5. Generate NEW Tokens
        // We generate a fresh pair. You *could* just generate a new Access Token, 
        // but rotating both is safer (Rotation Strategy).
        const accessToken = await userModel.generateAccessToken();
        const newRefreshToken = await userModel.generateRefreshToken();
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        // 6. Send Response
        // We send the new Access Token in JSON, and the new Refresh Token in the Cookie
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };

        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, options) // Update the cookie
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
    // Optimization: req.user is ALREADY fetched by verifyJWT middleware.
    // No need to query the database again!

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user, // Just send what we already have in memory
                "Current user fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logOutUser,
    updateUser,
    changePassword,
    updateAvatar,
    refreshAccessToken,
    getCurrentUser
};