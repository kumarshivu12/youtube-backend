import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getVideoComments = async (req, res) => {
  try {
    //fetching data from req.params
    const { videoId } = req.params;
    //fetching data from req.query
    const { page = 1, limit = 10 } = req.query;
    //fetching data from req.user
    const userId = req.user?._id;

    const options = {
      page,
      limit,
    };

    const aggregate = Comment.aggregate([
      {
        $match: {
          video: mongoose.Types.ObjectId(videoId),
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
          localField: "id",
          foreignField: "comment",
          as: "likes",
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
        $addFields: {
          owner: {
            $first: "$owner",
          },
          likes: {
            $size: "$likes",
          },
          isLiked: {
            $cond: {
              if: { $in: [userId, "$likes.likedBy"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          content: 1,
          likes: 1,
          owner: 1,
          isLiked: 1,
        },
      },
    ]);

    const videoComments = await Comment.aggregatePaginate(aggregate, options);

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          videoComments,
          "video comments fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting video comments"
    );
  }
};

export const addComment = async (req, res) => {
  try {
    // fetching data from req.params
    const { videoId } = req.params;
    //fetching data from req.body
    const { content } = req.body;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!content) {
      throw new ApiError(400, "content is required");
    }

    //getting video data from database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "video not found");
    }

    //creating comment
    const createdComment = await Comment.create({
      content,
      video: videoId,
      owner: userId,
    });
    if (!createdComment) {
      throw new ApiError(500, "failed to add comment");
    }

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, createdComment, "comment added successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while adding comment"
    );
  }
};

export const updateComment = async (req, res) => {
  try {
    //fetchig data from req.params
    const { commentId } = req.params;
    //fetching data from req.body
    const { content } = req.body;
    //fetching data from req.user
    const userId = req.user?._id;
    if (!content) {
      throw new ApiError(400, "content is required");
    }

    //getting comment data from database
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new ApiError(404, "comment not found");
    }
    if (comment?.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "only comment owner can edit their comment");
    }

    //updating comment
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $set: {
          content,
        },
      },
      { new: true }
    );
    if (!updatedComment) {
      throw new ApiError(500, "failed to update comment");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(200, updateComment, "comment updated successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while updating comment"
    );
  }
};

export const deleteComment = async (req, res) => {
  try {
    //fetchig data from req.params
    const { commentId } = req.params;
    //fetching data from req.user
    const userId = req.user?._id;

    //getting comment data from database
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new ApiError(404, "comment not found");
    }
    if (comment?.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "only comment owner can delete their comment");
    }

    //deleting comment
    await Comment.findByIdAndDelete(commentId);

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "comment deleted successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while deleting comment"
    );
  }
};
