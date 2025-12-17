import userModel from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAllUsers = asyncHandler(async (req, res) => {
    // Extract query params: search (text), batch (year), role (filter)
    const { search, batch, role } = req.query;

    const query = {};

    // 1. Search Filter (Name or Email)
    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } } // Added username just in case
        ];
    }

    // 2. Batch Filter (e.g., ?batch=2024)
    if (batch) {
        query.batch = batch;
    }

    // 3. Role Filter (e.g., ?role=CHIEF)
    // If frontend sends nothing, it fetches ALL roles (Users + Chiefs + Admins)
    if (role) {
        query.role = role.toUpperCase(); // Ensure "admin" becomes "ADMIN" to match DB
    }

    // 4. Fetch Data
    // We sort by createdAt (-1) to show newest users first
    const searchDoc = await userModel.find(query)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 });

    // 5. Handle Empty List
    if (!searchDoc || searchDoc.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No users found matching criteria."));
    }

    return res.status(200).json(new ApiResponse(200, searchDoc, "Fetch successful."));
});

export {
    getAllUsers
}