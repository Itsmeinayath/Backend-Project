import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


// Here we are going to generate access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refershToken = user.generateRefreshToken();

        user.refreshToken = refershToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refershToken };
    }
    catch (err) {
        throw new ApiError(500, "Failed to generate access and refresh tokens");
    }
};
// ************************************************************************************************************************

// This is register user controller

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // Extract user data from request body
    const { fullname, email, username, password } = req.body;

    // Validate that none of the fields are empty
    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if a user already exists with the same username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exists");
    }
    console.log(req.files);

    // Check if avatar file is provided
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Check if cover image file is provided (this is optional)
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Upload avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar");
    }

    // Upload cover image to Cloudinary (if provided)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    // Create a new user in the database
    const user = await User.create({
        fullname, // Full name of the user
        email, // Email of the user
        username: username.toLowerCase(), // Username in lowercase
        password, // Password (assume hashed elsewhere)
        avatar: avatar.url, // Avatar URL from Cloudinary
        coverImage: coverImage?.url || "" // Cover image URL from Cloudinary (optional)
    });

    // Retrieve the created user and exclude sensitive fields like password and refresh token
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Return success response with created user data
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});
// ************************************************************************************************************************

// here we are going to login user
const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // get user details : username, password, email
    // check if user exists
    // check if password matches
    // generate access token
    // generate refresh token
    // send tokens as cookie
    // return res
    // Extract email, username, and password from the request body
    const { email, username, password } = req.body;

    // Check if username or email is provided
    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required");
    }

    // Find the user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    // If user is not found, throw an error
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if the provided password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);

    // If password is invalid, throw an error
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    // Generate access and refresh tokens
    const { accessToken, refershToken } = await generateAccessAndRefreshToken(user._id);

    // Find the user by ID and exclude password and refreshToken fields
    const loggedUser = await User.findById(user._id).select("-password -refreshToken");

    // Set cookie options
    const options = {
        httpOnly: true,
        secure: true,
    };

    // Send the tokens as cookies and return the response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refershToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser, accessToken, refershToken
                },
                "User logged in successfully"
            )
        );
});
// ************************************************************************************************************************

// here we are going to logout user
const logoutUser = asyncHandler(async (req, res) => {
    // Update the user's refreshToken to undefined
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true,

        }
    )
    // Set cookie options
    const options = {
        httpOnly: true,
        secure: true,
    }
    // Clear the cookies and send the response
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully"))

});
// ************************************************************************************************************************

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefershToken = req.cookie.refershToken || req.body.refershToken

    if (!incomingRefershToken) {
        throw new ApiError(401, "Unauthorized request. Refresh token is required")
    }


    try {
        const decodedToken = jwt.verify(incomingRefershToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefershToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefershToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefershToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefershToken
                    },
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

// ************************************************************************************************************************

// Here we are going to change current password
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})
// ************************************************************************************************************************

// here we writinh endpoints for getting current user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current user fetched successfully")
})
// ************************************************************************************************************************

// here we are going to update account details . for there we can update the user namw also 
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

  const user =  User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullname, email }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))

});
// ************************************************************************************************************************

// Here we are updating avatar image
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, " Error while uploading avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { avatar: avatar.url }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))


})
// *************************************************************************************************************************

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, " Error while uploading Cover Image")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { coverImage: coverImage.url }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image updated successfully"))


})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};
