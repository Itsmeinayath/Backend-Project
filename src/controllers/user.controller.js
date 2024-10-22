import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
