const mongoose = require("mongoose");

const trialBalanceItemSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    accountCode: String,
    accountName: String,
    accountType: String,
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const trialBalanceSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    period: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    type: {
      type: String,
      enum: ["unadjusted", "adjusted"],
      default: "unadjusted",
    },
    items: [trialBalanceItemSchema],
    totalDebits: {
      type: Number,
      default: 0,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    isBalanced: Boolean,
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TrialBalance", trialBalanceSchema);
