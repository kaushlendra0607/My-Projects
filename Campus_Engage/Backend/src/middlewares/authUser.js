import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { ApiError } from "../utils/ApiError.js";

const authUser = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) throw new ApiError(401, "Unauthorized request!");
        const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userDoc = await userModel.findById(decodeToken?._id).select("-password -refreshToken");
        if (!userDoc) throw new ApiError(401, "Invalid Access toke!");
        req.user = userDoc;//the user method we are adding here is used in log out controller and others
        next();
    } catch (error) {
        console.error(error);
        throw new ApiError(401, error.message || "Invalid access token", error);
    }
});

export default authUser;