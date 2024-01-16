import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createPlaylist = async (req, res) => {
  try {
    //fetching data from req.body
    const { name, description } = req.body;
    //fetching data from req.user
    const { userId } = req.user;
    if (!name.trim() || !description.trim()) {
      throw new ApiError(400, "name and description required");
    }

    //getting existing playlist from database
    const existingPlaylist = await Playlist.findOne({
      $and: [{ name }, { owner: mongoose.Types.ObjectId(userId) }],
    });
    if (existingPlaylist) {
      throw new ApiError(400, "playlist already exists");
    }

    //creating new playlist
    const createdPlaylist = await Playlist.create({
      name,
      description,
      owner: userId,
    });
    if (!createdPlaylist) {
      throw new ApiError(500, "failed to create playlist");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(200, createPlaylist, "playlist created successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while creating playlist"
    );
  }
};

export const updatePlaylist = async (req, res) => {
  try {
    //fetching data from req.params
    const { playlistId } = req.params;
    //fetching data from req.user
    const { userId } = req.user;
    //fetching data from req.body
    const { name, description } = req.body;
    if (!name.trim() || !description.trim()) {
      throw new ApiError(400, "all fields required");
    }
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "invalid playlist id");
    }
    //getting playlist data from database
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new ApiError(404, "playlist not found");
    }
    if (playlist.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "only owner can edit the playlist");
    }

    //updating playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $set: {
          name,
          description,
        },
      },
      { new: true }
    );
    if (!updatedPlaylist) {
      throw new ApiError(500, "playlist not updated");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedPlaylist, "playlist updated successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while updating playlist"
    );
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    //fetching data from req.params
    const { playlistId } = req.params;
    //fetching data from req.user
    const { userId } = req.user;
    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
      throw new ApiError(400, "playlist id is invalid");
    }

    //getting playlist data from database
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new ApiError(404, "playlist not found");
    }
    if (playlist.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "only owner can delete the playlist");
    }

    //deleting playlist
    await Playlist.findByIdAndDelete(playlistId);

    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "playlist deleted successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while deleting playlist"
    );
  }
};

export const getUserPlaylists = async (req, res) => {
  try {
    //fetching data from req.params
    const { userId } = req.params;

    const userPlaylist = await Playlist.aggregate([
      {
        $match: {
          owner: mongoose.Types.ObjectId(userId),
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
              $project: {
                owner: 0,
                isPublished: 0,
              },
            },
          ],
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          videos: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    if (!userPlaylist?.length) {
      throw new ApiError(400, "user playlists not found");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          userPlaylist[0],
          "user playlist fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting user playlists"
    );
  }
};

export const getPlaylistById = async (req, res) => {
  try {
    //fetching data from req.params
    const { playlistId } = req.params;
    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
      throw new ApiError(400, "playlist id is invalid ");
    }

    //getting data from datbase
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new ApiError(404, "playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
      {
        $match: mongoose.Types.ObjectId(playlistId),
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
      {
        $match: {
          "videos.isPublished": true,
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
    ]);
    if (!playlistVideos?.length) {
      throw new ApiError(400, "playlist not found");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          playlistVideos[0],
          "playlist videos by id fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting playlist by id"
    );
  }
};

export const addVideoToPlaylist = async (req, res) => {
  try {
    //fetching data from req.params
    const { playlistId, videoId } = req.params;
    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
      throw new ApiError(400, "playlist id is invalid");
    }
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is invalid");
    }

    // getting playlist data from database
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new ApiError(404, "playlist not found!");
    }

    //getitng video data from database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "video not found!");
    }

    // check if video is already in the playlist
    if (playlist.videos.includes(videoId)) {
      throw new ApiError(400, "video is already in the playlist!");
    }

    // adding video to playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
      $push: { videos: videoId },
    });
    if (!updatedPlaylist) {
      throw new ApiError(500, " video not added to playlist!");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatePlaylist,
          "video added to playlist successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while adding video to playlist"
    );
  }
};

export const removeVideoFromPlaylist = async (req, res) => {
  try {
    //fetching data from req.params
    const { playlistId, videoId } = req.params;
    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
      throw new ApiError(400, "playlist id is invalid");
    }
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is invalid");
    }

    // getting playlist data from database
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new ApiError(404, "playlist not found!");
    }

    //getitng video data from database
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "video not found!");
    }

    // removing video to playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
      $pull: { videos: videoId },
    });
    if (!updatedPlaylist) {
      throw new ApiError(500, " video not removed from playlist!");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatePlaylist,
          "video removed from playlist successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message ||
        "something went wrong while removing video from playlist"
    );
  }
};
