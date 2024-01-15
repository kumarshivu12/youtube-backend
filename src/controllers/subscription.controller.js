import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";

export const getSubscribedChannels = async (req, res) => {
  try {
    //fetching channel id from req.params
    const { subscriberId } = req.params;
    if (!subscriberId.trim() || !isValidObjectId(subscriberId)) {
      throw new ApiError(400, "invalid subscriber id");
    }

    //getting subscribers
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "subscribedChannels",
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
          subscribedChannelLists: {
            $first: "$subscribedChannels",
          },
        },
      },
    ]);
    if (!subscribedChannels?.length) {
      throw new ApiError(400, "subsribed channels not found");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannels[0].subscribedChannels,
          "subscribed channels fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while getting subscribed channels"
    );
  }
};

export const getUserChannelSubscribers = async (req, res) => {
  try {
    //fetching channel id from req.params
    const { channelId } = req.params;
    if (!channelId.trim() || !isValidObjectId(channelId)) {
      throw new ApiError(400, "invalid channel id");
    }

    //getting user channel subscribers
    const subscriberChannels = await Subscription.aggregate([
      {
        $match: {
          channel: mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscribers",
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
          subscribers: {
            $first: "$subscribers",
          },
        },
      },
    ]);
    if (!subscriberChannels?.length) {
      throw new ApiError(400, "subscribers not found");
    }

    //sending response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscriberChannels[0].subscribers,
          "user channel subscribers fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message ||
        "something went wrong while getting user channel subscribers"
    );
  }
};

export const toggleSubscription = async (req, res) => {
  try {
    //fetching channel id from req.params
    const { channelId } = req.params;
    //fetching data from req.user
    const { userId } = req.user;
    if (!channelId.trim() || !isValidObjectId(channelId)) {
      throw new ApiError(400, "invalid subscriber id");
    }
    if (channelId.toString() === userId.toString()) {
      throw new ApiError(400, "can't subscribe yourself");
    }

    //getting channel data from database
    const channel = await User.findById(channelId);
    if (!channel) {
      throw new ApiError(400, "channel not found");
    }

    // checking subscription state
    const alreadySubscribed = await Subscription.findOne({
      $and: [
        { subscriber: mongoose.Types.ObjectId(userId) },
        { channel: mongoose.Types.ObjectId(channelId) },
      ],
    });

    if (alreadySubscribed) {
      await Subscription.findByIdAndDelete(alreadySubscribed._id);
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "user unsubscribed successfully"));
    } else {
      await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "user subscribed successfully"));
    }

    //sending response
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while toggling subscription"
    );
  }
};
