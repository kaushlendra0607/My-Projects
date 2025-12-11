import { ApiError } from "../utils/ApiError.js";

// Pass the allowed roles as arguments: verifyRole("ADMIN", "CHIEF")
export const verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user is already available from verifyJWT
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            throw new ApiError(403, "Access Denied: You do not have permission.");
        }
        next();
    };
};