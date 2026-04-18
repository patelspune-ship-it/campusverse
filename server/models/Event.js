import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: String,
  venue: String,
  image: String, // optional
  createdBy: String, // club name or admin id
});

export default mongoose.model("Event", eventSchema);
