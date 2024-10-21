import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    //get user data from frontend 
    //validate user data . is not empty, is email, is password
    //check if user already exists . check through email and username
    // check for images ,check for avatar
    //if images are there then upload them to cloudinary,avatar
    //create user object - create entry in database
    //remove password and refresh token from response
    //check for user creation and 
    // return response

    const { fullname, email, username, password } = req.body
    console.log("email", email);
    // "some" is a function that checks if any of the fields are empty
    // here we are checking if any of the fields are empty and if they are we throw an error
    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Please fill in all fields")
    }
    // here we are checking if user are already a user with the same email or username
    const exixtedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (exixtedUser) {
        throw new ApiError(409, "user with this email or username already exists")
    }
    // here we are checking if the user has uploaded an avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // here we are checking if the user has uploaded a cover image
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // here we are checking if the user has uploaded an avatar
    if (!avatarLocalPath) {
        throw new ApiError(400, "Please upload an avatar")
    }
    // here we are uploading the avatar and cover image to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // here check if the avatar is uploaded
    if (!avatar) {
        throw new ApiError(500, "Avatar file is required")
    }
    // here we are creating a user object and saving it to the database
    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })
    // here we are removing the password and refresh token from the response
    const createdUser = await User.findById(user._id).select("-password -refershToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser, "User created successfully")
    )
})

export { registerUser }