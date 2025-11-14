import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },  // chính là userId
    text: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Message", MessageSchema);
