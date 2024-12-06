import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId, //One who is subscribing i.e, --> Pragya's account
    ref: "User",
  },
  channel: {
    type: Schema.Types.ObjectId, //One to whom 'Subscriber' is subscribing i.e, --> Immortal.me yt channel
    ref: "User",
  },
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
