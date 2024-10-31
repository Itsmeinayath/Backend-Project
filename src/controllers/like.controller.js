import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    // check if user has already liked the video

    const likedAlready = await Like.findOne(
        {
            video: videoId,
            user: req.user._id
        }
    );
    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready._id)
        return res.json(new ApiResponse(200, { isLiked: false }, "Unliked video"))
    }

    // if user has not liked the video, create a new like

    await Like.create({
        video: videoId,
        user: req.user?._id
    });

    return res.json(new ApiResponse(200, { isLiked: true }, "Liked video"))


})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    // check if comment id is valid

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    // check if user has already liked the comment

    const likedAlready = await Like.findOne(
        {
            comment: commentId,
            user: req.user._id
        }
    );
    // if user has already liked the comment, delete the like

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.json(new ApiResponse(200, { isLiked: false }, "Unliked comment"))
    }

    await Like.create({
        comment: commentId,
        user: req.user?._id
    });

    return res.json(new ApiResponse(200, { isLiked: true }, "Liked comment"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    // check if user has already liked the tweet

    const likedAlready = await Like.findOne(
        {
            tweet: tweetId,
            user: req.user._id
        }
    );
    // if user has already liked the tweet, delete the like

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.json(new ApiResponse(200, { isLiked: false }, "Unliked tweet"))
    }

    await Like.create({
        tweet: tweetId,
        user: req.user?._id
    });
    return res.json(new ApiResponse(200, { isLiked: true }, "Liked tweet"))

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    // get all liked videos by the user
    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "ownerDetails"
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullname: 1,
                        "avatar.url": 1,
                    }
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggregate,
                "Liked videos fetched successfully"
            )
        )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}