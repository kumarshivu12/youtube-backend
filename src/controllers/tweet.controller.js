import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createTweet = async (req, res) => {
  try {
    //fetching data from req.body
    const { content } = req.body;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!content) {
      throw new ApiError(400, "content is required");
    }

    //creating tweet
    const createdTweet = await Tweet.create({
      content,
      owner: userId,
    });
    if (!createdTweet) {
      throw new ApiError(500, "failed to create tweet");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, createTweet, "tweet created successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while creating tweet"
    );
  }
};

export const updateTweet = async (req, res) => {
  try {
    //fetching data from req.body
    const { content } = req.body;
    //fetching data from req.params
    const { tweetId } = req.params;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!content) {
      throw new ApiError(400, "content is required");
    }
    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "invalid tweet id");
    }

    //getting tweet  data from database
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      throw new ApiError(404, "tweet not found");
    }
    if (tweet?.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "only owner can edit thier tweet");
    }

    //updating tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content,
        },
      },
      { new: true }
    );
    if (!updatedTweet) {
      throw new ApiError(500, "failed to edit tweet");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, updateTweet, "tweet updated successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while updating tweet"
    );
  }
};

export const deleteTweet = async (req, res) => {
  try {
    //fetching data from req.params
    const { tweetId } = req.params;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "invalid tweet id");
    }

    //getting tweet  data from database
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      throw new ApiError(404, "tweet not found");
    }
    if (tweet?.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "only owner can delete thier tweet");
    }

    //deleting tweet
    await Tweet.findByIdAndDelete(tweetId);

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "tweet deleted successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while deleting tweet"
    );
  }
};

export const getUserTweets = async (req, res) => {
  try {
    //fetching data from req.params
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "invalid userId");
    }

    const userTweets = await Tweet.aggregate([
      {
        $match: {
          owner: mongoose.Types.ObjectId(userId),
        },
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
          foreignField: "tweet",
          as: "likes",
          pipeline: [
            {
              $project: {
                likedBy: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          likes: {
            $size: "$likes",
          },
          owner: {
            $first: "$owner",
          },
        },
      },
      {
        $project: {
          content: 1,
          owner: 1,
          likes: 1,
          createdAt: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    if (!userTweets?.length) {
      throw new ApiError(400, "user tweets not found");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(200, userTweets[0], "user tweets fetched successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting user tweets"
    );
  }
};
