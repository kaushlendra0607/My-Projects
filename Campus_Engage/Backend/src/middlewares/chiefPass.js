import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import userModel from "../models/userModel.js";


const changePass = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email required");

  const user = await userModel.findOne({ email }).select("isDefaultPassword");
  if (!user) return next(); // let login handler decide invalid credentials
  if (user.isDefaultPassword) {
    throw new ApiError(400, "Please change the default password before logging in.");
  }
  next();
});

export default changePass;