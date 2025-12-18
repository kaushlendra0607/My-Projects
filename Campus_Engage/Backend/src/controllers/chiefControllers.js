import userModel from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import registrationModel from "../models/registrationModel.js";

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

const changeUserRole = asyncHandler(async (req, res) => {
    // 1. Inputs
    const { userId, newRole } = req.body; // newRole: "CHIEF", "USER", "ADMIN"
    if(req.user.role !== "CHIEF") throw new ApiError(400,"Only chiefs are allowed to change role.");

    // 2. Validation
    if (!["USER", "CHIEF", "ADMIN"].includes(newRole)) {
        throw new ApiError(400, "Invalid role specified.");
    }

    // 3. Update
    const user = await userModel.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: true }
    ).select("-password");

    if (!user) throw new ApiError(404, "User not found.");

    res.status(200).json(new ApiResponse(200, user, `User role updated to ${newRole}`));
});

const bulkDeleteGraduatedUsers = asyncHandler(async (req, res) => {
    const { batchYear } = req.body; // Explicitly passed by Admin (e.g., 2021)

    // SAFETY CHECK: Don't delete future students or current students by mistake
    const currentYear = new Date().getFullYear();
    if (batchYear > currentYear) {
        throw new ApiError(400, "Cannot delete current or future batches. Only past batches allowed.");
    }
    if(req.user.role !== "CHIEF") throw new ApiError(400,"Only chiefs are allowed to delete.");

    // 1. Find the users first (to get their IDs for cleanup)
    const usersToDelete = await userModel.find({ batch: batchYear });
    const userIds = usersToDelete.map(u => u._id);

    if (userIds.length === 0) {
        throw new ApiError(404, `No students found for batch ${batchYear}.`);
    }

    // 2. CLEANUP: Delete their Registrations first (Cascading Delete)
    // If you don't do this, your Event lists will have broken links!
    await registrationModel.deleteMany({ user: { $in: userIds } });

    // 3. DELETE USERS
    const result = await userModel.deleteMany({ batch: batchYear });

    res.status(200).json(
        new ApiResponse(200, { deletedCount: result.deletedCount }, `Successfully graduated and deleted ${result.deletedCount} students from batch ${batchYear}.`)
    );
});

const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if(req.user.role !== "CHIEF") throw new ApiError(400,"Only chiefs are allowed to change role.");

    // 1. Cleanup Registrations
    await registrationModel.deleteMany({ user: userId });

    // 2. Delete User
    const deletedUser = await userModel.findByIdAndDelete(userId);

    if (!deletedUser) throw new ApiError(404, "User not found");

    res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});

export {
    getAllUsers,
    changeUserRole,
    bulkDeleteGraduatedUsers,
    deleteUser
}