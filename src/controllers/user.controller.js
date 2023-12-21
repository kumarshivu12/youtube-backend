import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
      .status(200)
      .json(new ApiResponse(200, createdUser, "user registered successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "somehting went wrong while registering user"
    );
  }
};
