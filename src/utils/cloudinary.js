import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    console.log(localFilePath);
    if (!localFilePath) {
      response.status(400), "avatar local file path is missing";
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
    res.status(400, "something went wrong while uploading file on cloudinary");
  }
};
