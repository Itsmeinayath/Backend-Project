import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

// Helper function for validating ObjectId
const validateObjectId = (id, name) => {
    if (!isValidObjectId(id)) {
        throw new ApiError(400, `Invalid ${name}`);
    }
};

// Helper function to check if the user is the owner
const checkOwnership = (ownerId, userId, action = "perform this action") => {
    if (ownerId.toString() !== userId.toString()) {
        throw new ApiError(403, `Only the owner can ${action}`);
    }
};

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name || !description) throw new ApiError(400, "Name and description are required");

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params;
    validateObjectId(playlistId, "PlaylistId");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");
    checkOwnership(playlist.owner, req.user?._id, "edit this playlist");

    playlist.name = name;
    playlist.description = description;
    const updatedPlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    validateObjectId(playlistId, "PlaylistId");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");
    checkOwnership(playlist.owner, req.user?._id, "delete this playlist");

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    validateObjectId(playlistId, "PlaylistId");
    validateObjectId(videoId, "VideoId");

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) throw new ApiError(404, "Playlist not found");
    if (!video) throw new ApiError(404, "Video not found");
    checkOwnership(playlist.owner, req.user?._id, "add video to this playlist");

    playlist.videos.addToSet(videoId); // Use addToSet to prevent duplicates
    const updatedPlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    validateObjectId(playlistId, "PlaylistId");
    validateObjectId(videoId, "VideoId");

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) throw new ApiError(404, "Playlist not found");
    if (!video) throw new ApiError(404, "Video not found");
    checkOwnership(playlist.owner, req.user?._id, "remove video from this playlist");

    playlist.videos.pull(videoId);
    const updatedPlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    validateObjectId(playlistId, "PlaylistId");

    const playlistVideos = await Playlist.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
        { $lookup: { from: "videos", localField: "videos", foreignField: "_id", as: "videos" } },
        { $match: { "videos.isPublished": true } },
        { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "owner" } },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" },
                owner: { $first: "$owner" }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: { username: 1, fullName: 1, "avatar.url": 1 }
            }
        }
    ]);

    if (!playlistVideos.length) throw new ApiError(404, "Playlist not found");

    return res
        .status(200)
        .json(new ApiResponse(200, playlistVideos[0], "Playlist fetched successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    validateObjectId(userId, "UserId");

    const playlists = await Playlist.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        { $lookup: { from: "videos", localField: "videos", foreignField: "_id", as: "videos" } },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
};
