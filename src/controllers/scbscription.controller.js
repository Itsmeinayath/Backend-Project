import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
   
    // validate channelId 
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    // check if the user is already subscribed to the channel

    const isSubscribed = await Subscription.findOne({
        subscriber:req.User._id,
        channel: channelId
    });


    if(isSubscribed){
        // unsubscribe if a subscription exists
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res
        .status(200)
        .json(
            new ApiResponse(
                "Unsubscribed successfully",
            )
        );
    }

    // Create a new subscription if user is not subscribed

    await Subscription.create({
        subscriber:req.User._id,
        channel: channelId
    });

    return res 
    .status(200)
    .json(
        new ApiResponse(
            200,
            {subscribed: true},
            "Subscribed successfully"
        )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    // validate channelId format

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    channelId = new mongoose.Types.ObjectId(channelId);

    const subscribers = await Subscription.aggregate([
        {
             // Match only documents with the specified channelId
            $match:{
                channel:channelId
            }
        },
        {
            // Join with the users collection
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        // Join  with subscribers collection for each subscriber
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"subscriber",
                            as:"subscribedTosubscriber"

                        },
                    },
                    {
                        $addFields:{
                            // Add fields for count and relationship status
                            subscribedTosubscriber:{
                                $cond:{
                                    if:{$in:[channelId, "$subscribedTosubscriber.subscriber"]},
                                    then:true,
                                    else:false
                                },
                            },
                            subscriberCount:{$size:"$subscribedTosubscriber"}
                        },
                    },
                ],
            },
        },
        {$unwind:"$subscriber"},
        {
            $project:{
                _id:0,
                subscriber:{
                    _id:1,
                    username:1,
                    fullname:1,
                    "avatar.url":1,
                    subscribedTosubscriber:1,
                    subscriberCount:1
                },
            },
        },
    ]);
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribers,
            "Subscribers fetched successfully"
        )
    );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) }, // Match by subscriber ID
        },
        {
            $lookup: { // Join with the users collection for channel data
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: { // Join with videos collection to get videos for the channel
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: { // Add the latest video field for each channel
                            latestVideo: { $last: "$videos" },
                        },
                    },
                ],
            },
        },
        { $unwind: "$subscribedChannel" }, // Unwind to access each channel individually
        {
            $project: { // Project only necessary fields for subscribed channels
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                    },
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "subscribed channels fetched successfully"
            )
        );
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}