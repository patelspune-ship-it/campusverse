import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  prn: { type: String, unique: true, required: true },
  email: String,
  mobile: String,
  password: String
});

export default mongoose.model("User", userSchema);
