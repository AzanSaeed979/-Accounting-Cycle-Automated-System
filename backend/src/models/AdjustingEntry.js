const mongoose = require("mongoose");

const adjustingEntrySchema = new mongoose.Schema(
  {
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: [
        "accrued-revenue",
        "accrued-expense",
        "deferred-revenue",
        "deferred-expense",
        "depreciation",
        "provision",
        "writeoff",
        "other",
      ],
      required: true,
    },
    reason: String,
    effectiveDate: {
      type: Date,
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: Date,
    isApproved: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdjustingEntry", adjustingEntrySchema);
