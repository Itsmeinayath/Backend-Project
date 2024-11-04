import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import {
    uploadOnCloudinary,
    deleteOnCloudinary
} from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";

// Helper function to validate ObjectId
const validateObjectId = (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(400, "Invalid ID");
    }
};

// get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;
    const pipeline = [];

    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query,
                    path: ["title", "description"]
                }
            }
        });
    }

    if (userId) {
        validateObjectId(userId);
        pipeline.push({
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        });
    }

    pipeline.push({ $match: { isPublished: true } });

    if (sortBy && sortType) {
        pipeline.push({
            $sort: { [sortBy]: sortType === "asc" ? 1 : -1 }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
            pipeline: [{ $project: { username: 1, "avatar.url": 1 } }]
        }
    }, { $unwind: "$ownerDetails" });

    const videoAggregate = Video.aggregate(pipeline);
    const options = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    const videos = await Video.aggregatePaginate(videoAggregate, options);

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// Upload to Cloudinary and return URL and public_id
const uploadFilesToCloudinary = async (filePaths) => {
    const uploads = await Promise.all(filePaths.map(path => uploadOnCloudinary(path)));
    return uploads;
};

// Publish a video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description || !req.files?.videoFile || !req.files?.thumbnail) {
        throw new ApiError(400, "All fields are required");
    }

    const [videoFile, thumbnailFile] = await uploadFilesToCloudinary([
        req.files.videoFile[0].path,
        req.files.thumbnail[0].path
    ]);

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnailFile.url,
            public_id: thumbnailFile.public_id
        },
        owner: req.user?._id,
        isPublished: false
    });

    return res.status(200).json(new ApiResponse(200, video, "Video uploaded successfully"));
});

// Get video by ID
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    validateObjectId(videoId);

    const video = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $in: [req.user?._id, "$subscribers.subscriber"]
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                owner: { $first: "$owner" },
                isLiked: { $in: [req.user?._id, "$likes.likedBy"] }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    await User.findByIdAndUpdate(req.user?._id, { $addToSet: { watchHistory: videoId } });

    return res.status(200).json(new ApiResponse(200, video[0], "Video details fetched successfully"));
});

// Update video
const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;

    validateObjectId(videoId);

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't edit this video as you are not the owner");
    }

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        { new: true }
    );

    await deleteOnCloudinary(video.thumbnail.public_id);

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

// Delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    validateObjectId(videoId);

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't delete this video as you are not the owner");
    }

    await Video.findByIdAndDelete(video._id);
    await deleteOnCloudinary(video.thumbnail.public_id);
    await deleteOnCloudinary(video.videoFile.public_id);

    await Like.deleteMany({ video: videoId });
    await Comment.deleteMany({ video: videoId });

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// Toggle publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    validateObjectId(videoId);

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't toggle publish status as you are not the owner");
    }

    const toggledVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: { isPublished: !video.isPublished } },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, toggledVideo, "Publish status toggled successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
