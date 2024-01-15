import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export const getChannelStats = async (req, res) => {
  // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  try {
    //fetching data from req.user
    const { userId } = req.user;

    //getting video stats
    const videoStats = await Video.aggregate([
      {
        $match: {
          owner: mongoose.Types.ObjectId(userId),
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
          videoLikes: {
            $size: "$likes",
          },
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: {
            $sum: 1,
          },
          totalViews: {
            $sum: "$views",
          },
          totalLikes: {
            $sum: "$videoLikes",
          },
        },
      },
      {
        $project: {
          totalVideos: 1,
          totalViews: 1,
          totalLikes: 1,
        },
      },
    ]);

    //getting user stats
    const userStats = await Subscription.aggregate([
      {
        $match: {
          channe: mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalSubscribers: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          totalSubscribers: 1,
        },
      },
    ]);

    //channel stats
    const channelStats = {
      totalSubscribers: userStats[0].totalSubscribers || 0,
      totalVideos: videoStats[0].totalVideos || 0,
      totalViews: videoStats[0].totalViews || 0,
      totalLikes: videoStats[0].totalLikes || 0,
    };

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(200, channelStats, "channel stats fetched successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting channel stats"
    );
  }
};

export const getChannelVideos = async (req, res) => {
  try {
    //fetching data from req.user
    const { userId } = req.user;

    //getting channel videos
    const channelVideos = await Video.aggregate([
      {
        $match: {
          owner: mongoose.Types.ObjectId(userId),
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
          likesCount: {
            $size: "$likes",
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          videoFile: 1,
          thumbnail: 1,
          isPublished: 1,
          likesCount: 1,
        },
      },
    ]);

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channelVideos[0],
          "channel videos fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting channel videos"
    );
  }
};
