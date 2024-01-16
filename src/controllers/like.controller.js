import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const toggleVideoLike = async (req, res) => {
  try {
    //fetching data from req.params
    const { videoId } = req.params;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "invalid video id");
    }

    //getting like state from database
    const isLiked = await Like.findOne({
      video: videoId,
      likedBy: userId,
    });
    if (isLiked) {
      await Like.findByIdAndDelete(isLiked?._id);

      //sending response
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "video unliked  successfully"));
    } else {
      await Like.create({
        video: videoId,
        likedBy: userId,
      });

      //sending response
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "video liked successfully"));
    }
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while toggling video like"
    );
  }
};

export const toggleCommentLike = async (req, res) => {
  try {
    //fetching data from req.params
    const { commentId } = req.params;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "invalid comment id");
    }

    //getting like state from database
    const isLiked = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });
    if (isLiked) {
      await Like.findByIdAndDelete(isLiked?._id);

      //sending response
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "comment unliked  successfully"));
    } else {
      await Like.create({
        comment: commentId,
        likedBy: userId,
      });

      //sending response
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "comment liked successfully"));
    }
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while toggling comment like"
    );
  }
};

export const toggleTweetLike = async (req, res) => {
  try {
    //fetching data from req.params
    const { tweetId } = req.params;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "invalid tweet id");
    }

    //getting like state from database
    const isLiked = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    });
    if (isLiked) {
      await Like.findByIdAndDelete(isLiked?._id);

      //sending response
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "tweet unliked  successfully"));
    } else {
      await Like.create({
        tweet: tweetId,
        likedBy: userId,
      });

      //sending response
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "tweet liked successfully"));
    }
  } catch (error) {
    throw new ApiError(400, error?.message || "something went wrong while");
  }
};

export const getLikedVideos = async (req, res) => {
  try {
    //fetching data from req.user
    const userId = req.user?._id;

    const likedVideos = await Like.aggregate([
      {
        $match: {
          likedBy: mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "videos",
          pipeline: [
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
            },
          ],
        },
      },
    ]);
    if (!likedVideos?.length) {
      throw new ApiError(400, "liked videos not found");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(200, likedVideos, "liked videos fetched successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting liked videos"
    );
  }
};
