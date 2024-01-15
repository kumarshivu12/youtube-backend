import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const getAllVideos = async (req, res) => {
  try {
    //fetching data from req.query
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const options = {
      page,
      limit,
    };
    const pipeline = [];

    if (userId && isValidObjectId(userId)) {
      pipeline.push({
        $match: {
          owner: mongoose.Types.ObjectId(userId),
        },
      });
    }
    if (query) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        },
      });
    }
    if (sortBy && sortType) {
      pipeline.push({
        $sort: {
          [sortBy]: sortType === "desc" ? -1 : 1,
        },
      });
    }
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      }
    );

    const aggregate = Video.aggregate(pipeline);
    const videos = await Video.aggregatePaginate(aggregate, options);
    if (!videos?.length) {
      throw new ApiError(400, "videos not found");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "videos fetched successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting all videos"
    );
  }
};

export const getVideoById = async (req, res) => {
  try {
    //fetching video id from req.params
    const { videoId } = req.params;
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is invalid");
    }

    const video = await Video.aggregate([
      {
        $match: mongoose.Types.ObjectId(videoId),
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
          likes: {
            $size: "$likes",
          },
        },
      },
    ]);
    if (!video?.length) {
      throw new ApiError(400, "video not found");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, video[0], "video fetched successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting video by id"
    );
  }
};

export const publishAVideo = async (req, res) => {
  try {
    //fetching data from req.body
    const { title, description } = req.body;
    //fetching data from req.user
    const { userId } = req.user;
    //fetching data from req.files
    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;
    if (!title.trim() || !description.trim()) {
      throw new ApiError(400, "all fields required");
    }
    if (!videoFileLocalPath) {
      throw new ApiError(400, "video file is required !");
    }
    if (!thumbnailLocalPath) {
      throw new ApiError(400, "thumbnail file is required !");
    }

    //uploading file on cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!videoFile && !thumbnail) {
      throw new ApiError(
        500,
        "could not upload video and thumbnail on cloudinary!"
      );
    }

    //creating video object
    const createdVideo = await Video.create({
      title: title,
      description,
      videoFile: responseVideoFile.url,
      thumbnail: responseThumbnail.url,
      duration: responseVideoFile.duration,
      owner: mongoose.Types.ObjectId(userId),
    });

    const video = await Video.findById(createdVideo._id).select("-owner");
    if (!video) {
      throw new ApiError(500, "something went wrong in publishing video");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, video, "video published successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while publishing video"
    );
  }
};

export const updateVideo = async (req, res) => {
  try {
    //fetching data from req.params
    const { videoId } = req.params;
    //fetching data from req.user
    const { userId } = req.user;
    //fetching data from req.body
    const { title, description } = req.body;
    if (!title.trim() && !description.trim()) {
      throw new ApiError(400, "all fields are required");
    }
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is invalid !");
    }

    //getting existing video from database
    const existingVideo = await Video.findById(videoId);
    if (!existingVideo) {
      throw new ApiError(404, "video not found !");
    }
    if (existingVideo.owner.toString() !== userId.toString()) {
      throw new ApiError(401, "unauthorised user");
    }

    //fetching data from req.file
    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) {
      throw new ApiError(400, "thumbnail is required");
    }

    //uploading file on cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new ApiError(500, "error while uploadnig in cloudinray");
    }

    //updating video
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: thumbnail?.url,
        },
      },
      {
        new: true,
      }
    );
    if (!updatedVideo) {
      throw new ApiError(500, "error while updating video!");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, updateVideo, "video updated successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while updating video"
    );
  }
};

export const deleteVideo = async (req, res) => {
  try {
    //fetching video id from req.params
    const { videoId } = req.params;
    //fetching data from req.user
    const { userId } = req.user;
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is invalid !");
    }

    //getting data from database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "video not found !");
    }
    if (video.owner.toString() !== userId.toString()) {
      throw new ApiError(401, "unauthorised user!");
    }

    //deleting video from database
    await Video.findByIdAndDelete(videoId);

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "video deleted successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while deleting video"
    );
  }
};

export const togglePublishStatus = async (req, res) => {
  try {
    //fetching video id from req.params
    const { videoId } = req.params;
    //fetching data from req.user
    const { userId } = req.user;
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is invalid !");
    }

    //getting data from database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "video not found !");
    }
    if (video.owner.toString() !== userId.toString()) {
      throw new ApiError(401, "unauthorised user!");
    }

    //toggling publish status
    const updateVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: { isPublished: !isPublished },
      },
      { new: true }
    );
    if (!updateVideo) {
      throw new ApiError(500, "publish status not toggled");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updateVideo,
          "video publish status toggled successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while toggling publish status"
    );
  }
};
