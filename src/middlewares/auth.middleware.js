import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = async (req, res, next) => {
  try {
    //fetching access token from cookies
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "invalid access token");
    }

    //decoding access token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //getting user data from database
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "unauthorized user");
    }
    
    //adding user object in req
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while verifying user"
    );
  }
};
