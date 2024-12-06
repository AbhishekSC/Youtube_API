import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asynHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

// Header waale section mai postman mai --> Authorization-key | value : Bearer Token
export const verifyJWT = asynHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refereshToken"
    );

    //DISCUSS ABOUT FRONTEND- PENDING
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user; // ye humne controller ke logout() mai bhi user ka access ho jaye ishliye kara hai
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
