
import mongoose from "mongoose";

const budgetRequestSchema = new mongoose.Schema(
  {
    club_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    // The club admin User who submitted this request
    requested_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true },

    request_type: {
      type: String,
      enum: ["annual", "event"],
      required: true,
    },

    // Only set when request_type is "event"
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },

    amount_requested: { type: Number, required: true },
    // Admin may approve a different amount than requested — null until actioned
    amount_approved:  { type: Number, default: null },

    purpose: { type: String, required: true },

    // Optional itemized breakdown
    breakdown: {
      type: [{ item: { type: String, required: true }, cost: { type: Number, required: true } }],
      default: [],
    },

    academic_year: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Required on reject, optional on approve
    admin_remarks: { type: String, default: null },
    actioned_by:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actioned_at:   { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

budgetRequestSchema.index({ club_id: 1, status: 1 });
budgetRequestSchema.index({ status: 1 });
budgetRequestSchema.index({ academic_year: 1 });

export default mongoose.model("BudgetRequest", budgetRequestSchema);
