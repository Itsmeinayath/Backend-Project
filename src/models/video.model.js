// Importing mongoose and Schema from mongoose library
import mongoose, { Schema } from "mongoose";

// Importing mongoose-aggregate-paginate-v2 plugin for pagination
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// Defining the schema for the Video model
const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //cloudinary url
      required: true
  },
  thumbnail: {
      type: String, //cloudinary url
      required: true
  },
  title: {
      type: String, 
      required: true
  },
  description: {
      type: String, 
      required: true
  },
  duration: {
      type: Number, 
      required: true
  },
  views: {
      type: Number,
      default: 0
  },
  isPublished: {
      type: Boolean,
      default: true
  },
  owner: {
      type: Schema.Types.ObjectId,
      ref: "User"
  }

}, 
{
  timestamps: true
}
  
);

// Adding pagination plugin to the schema
videoSchema.plugin(mongooseAggregatePaginate);

// Exporting the Video model based on the videoSchema
export const Video = mongoose.model("Video", videoSchema);