// Importing necessary modules and utilities
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Middleware to verify JWT token
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Extract token from cookies or Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        // If no token is found, return an unauthorized error
        if (!token) {
            return next(new ApiError(401, "Unauthorized request"));
        }

        // Verify the token using the secret key
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user by ID and exclude password and refreshToken fields
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // If no user is found, return an invalid access token error
        if (!user) {
            return next(new ApiError(401, "Invalid Access Token"));
        }

        // Attach the user object to the request
        req.user = user;
        next();
    } catch (error) {
        // If an error occurs, throw an unauthorized error
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});