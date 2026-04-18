import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
  userId: String,
  eventId: String,
  registeredAt: { type: Date, default: Date.now },
});

export default mongoose.model("Registration", registrationSchema);
