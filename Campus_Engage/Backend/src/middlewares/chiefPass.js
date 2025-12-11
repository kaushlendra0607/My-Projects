import { ApiError } from "../utils/ApiError.js";

export const requirePasswordChange = (req, res, next) => {
    // req.user comes from verifyJWT middleware
    if (req.user?.isDefaultPassword === true) {
        throw new ApiError(403, "Action Blocked: You must change your default password first.");
    }
    next();
};

export default requirePasswordChange;