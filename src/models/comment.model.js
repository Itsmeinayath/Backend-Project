// Importing mongoose and Schema from mongoose library
import mongoose, { Schema } from "mongoose";

// Importing mongoose-aggregate-paginate-v2 plugin for pagination
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new Schema(
    {
        content:{
            type: String,
            required: true
        },
        video:{
            type:Schema.Types.ObjectId,
            ref: "Video",
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true
    }
)


// Adding pagination plugin to the schema
commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = mongoose.model("Comment", commentSchema);