import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

const uploadOnCloudinary = async (localFilePath) => {
   try {
    if (!localFilePath) {
        throw new Error("File path is required.");
    }
    // upload the file on cloudinary
  const response =  await cloudinary.uploader.upload(localFilePath,{
        resource_type: "auto",
    })
    // file uploaded successfully
    // console.log("File uploaded successfully",response.url);
    fs.unlinkSync(localFilePath);
    return response
    // this will delete the file from local storage
   } catch (error) {
    fs.unlinkSync(localFilePath); // this will delete the file from local storage
    return null;
   }
}

export {uploadOnCloudinary}
