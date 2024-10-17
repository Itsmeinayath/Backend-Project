// Importing mongoose and Schema from mongoose library
import mongoose, { Schema } from "mongoose";

// Importing mongoose-aggregate-paginate-v2 plugin for pagination
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// Defining the schema for the Video model
const videoSchema = new Schema(
  {
    // Add your schema fields here
  },
  {
    // Enabling timestamps to automatically add createdAt and updatedAt fields
    timestamps: true
  }
);

// Adding pagination plugin to the schema
videoSchema.plugin(mongooseAggregatePaginate);

// Exporting the Video model based on the videoSchema
export const Video = mongoose.model("Video", videoSchema);