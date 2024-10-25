import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // this is the id of the user who is subscribing to the channel
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // this id is the id of the channel that the user is subscribing to
        ref: "User"
    }

},
    { timestamps: true }
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)