import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId)
    if (!video) {
        return next(new ApiError("Video not found", 404))
    }
    // Aggregation pipeline to fetch comments for a video,user details and like count
    const commentsAggregate = await Comment.aggregate([
        {
            // Step 1: Match comments to the specific video
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },
        // Step 2: Lookup user details for each comments owner
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        // step 3 : lookup likes for each comment
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        // Step 4 Add fields for each likes count and check if user has liked the comment
        {
            $addFields:{
                likesCount:{$size:"$likes"},
                owner:{$first:"$owner"},
                isLiked:{
                    $cond:{
                        if:{$in:[req.user?._id, "$likes.likedBy"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        // Step 5: sort comments by creation date (newest first)
        {
            $sort:{
                createdAt:-1
            }
        },
        // Step 6: project the response to only include the required fields
        {
            $project:{
                content:1,
                createdAt:1,
                likesCount:1,
                owner:{
                    username:1,
                    fullname:1,
                    "avatar.url":1
                },
                isLiked:1
            }
        }
    ]);

    // paginate the aggregated comments (results)

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    };

    const comments = await Comment.aggregatePaginate(commentsAggregate,options);

    return res 
        .status(200)
        .json(new ApiResponse("Comments fetched successfully"));

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {videoId} = req.params
    const {content} = req.body

    // check if content is provided
    if (!content) {
        return next(new ApiError("Comment content is required", 400))
    }

    // check if video exists

    const video = await Video.findById(videoId)
    if (!video) {
        return next(new ApiError("Video not found", 404))
    }

    // create a new  comment
    const comment = new Comment.create({
        content,
        owner:req.user?._id,
        video:videoId
    })

    if(!comment){
       throw new ApiError(500 ,"Failed to add comment , please try again");
    }

    return res
        .status(201)
        .json(new ApiResponse(201 ,"Comment added successfully"))
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const {commentId} = req.params
    const {content} = req.body

    // check if content is provided

    if (!content) {
        throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // check if the current user is the owner of the comment
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Only the owner can edit the comment");
    }
    // update the comment

    const updatedComment = await Comment.findByIdAndUpdate(
        comment._id,
        {$set:{content}},
        {new:true}
    );

    if(!updatedComment){
        throw new ApiError(500, "Failed to update comment, please try again");
    }

    return res 
        .status(200)
        .json(new ApiResponse(200, "Comment updated successfully"));


})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const {commentId} = req.params

    // find the comment to be deleted
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // check if the current user is the owner of the comment

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Only the owner can delete the comment");
    }

    // delete the comment

    await Comment.findByIdAndDelete(commentId);
    
     // Optionally, delete likes associated with the deleted comment
     await Like.deleteMany({ comment: commentId, likedBy: req.user });

    return res
        .status(200)
        .json(new ApiResponse(200, "Comment deleted successfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }