import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//setting up cookies options
const options = {
  httpOnly: true,
  secure: true,
};

// generating access and refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    //getting user data from database
    const user = await User.findById(userId);

    //generating access and refresh tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    //returning access and refresh tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      error?.message ||
        "something went wrong while generating access and refresh token"
    );
  }
};

export const registerUser = async (req, res) => {
  try {
    //fetching data from req.body
    const { username, fullName, email, password } = req.body;
    if (
      [username, fullName, email, password].some(
        (field) => !field || field.trim() === ""
      )
    ) {
      throw new ApiError(400, "all fields required");
    }

    //getting data from database to check user availability
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
      throw new ApiError(409, "user already exists");
    }

    //accessing files from req.files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
      throw new ApiError(400, "avatar file is required");
    }

    //uploading files on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
      throw new ApiError(400, "avatar file is required");
    }

    //creating new user
    const user = await User.create({
      username: username.toLowerCase(),
      fullName,
      email,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    //getting created user
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "user not registered");
    }

    //sending response
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "user registered successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while registering user"
    );
  }
};

export const loginUser = async (req, res) => {
  try {
    //fetching data from req.body
    const { username, email, password } = req.body;
    if (
      [username, email, password].some((field) => !field || field.trim() === "")
    ) {
      throw new ApiError(400, "all fields are required");
    }
    //getting user data from database
    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) {
      throw new ApiError(400, "user doesn't not exists");
    }

    //checking password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(409, "invalid user credentials");
    }

    //generating access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    //getting logged in user data from database
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    //sending response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, loggedInUser, "user loggedin successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while logging in user"
    );
  }
};

export const logoutUser = async (req, res) => {
  try {
    //getting user data from req.user
    const id = req.user._id;

    //setting refresh token as null
    await User.findByIdAndUpdate(
      id,
      { $set: { refreshToken: null } },
      { new: true }
    );

    //sending response
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user logged out successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while logging out user"
    );
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    //fetching incoming refresh token
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request");
    }
    //decoding refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //getting user data from database
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "unauthorized user");
    }
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(400, "refresh token expired or used");
    }

    //getting new access and refresh tokens
    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    //sending response
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while refreshing access token"
    );
  }
};

export const changeCurrentPassword = async (req, res) => {
  try {
    //fetching data from req.body
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "all fields required");
    }

    //fetching user id from req.user
    const id = req.user?._id;
    const user = await User.findById(id);
    const isPasswordValid =await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
      throw new ApiError(400, "invalid old password");
    }

    //saving new password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "password changed successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while changing password"
    );
  }
};
