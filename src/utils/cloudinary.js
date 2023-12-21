import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./ApiError.js";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    console.log(localFilePath)
    if (!localFilePath) {
      throw new ApiError
    }

    //upload files on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //deleting file from server(local...)
    fs.unlinkSync(localFilePath);

    //sending response
    return response;
  } catch (error) {
    //deleting file from server(local...)
    fs.unlinkSync(localFilePath);
    throw new ApiError(400,error?.message || "something went wrong while uploading file on cloudinary")
  }
};
