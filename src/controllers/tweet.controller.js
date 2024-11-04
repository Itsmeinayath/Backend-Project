import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { Tweet } from "../models/tweet.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";

// Create a tweet
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) throw new ApiError(400, "Content is required");

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if (!tweet) throw new ApiError(500, "Failed to create tweet, please try again");

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

// Update a tweet
const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { tweetId } = req.params;

    if (!content) throw new ApiError(400, "Content is required");

    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "Only the owner can edit this tweet");

    tweet.content = content;
    const updatedTweet = await tweet.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

// Delete a tweet
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "Only the owner can delete this tweet");

    await tweet.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, { tweetId }, "Tweet deleted successfully"));
});

// Get tweets for a user with detailed information
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    { $project: { username: 1, "avatar.url": 1 } },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    { $project: { likedBy: 1 } },
                ],
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likeDetails" },
                ownerDetails: { $first: "$ownerDetails" },
                isLiked: {
                    $in: [req.user?._id, "$likeDetails.likedBy"],
                },
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

export {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
};
