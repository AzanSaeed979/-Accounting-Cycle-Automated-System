const mongoose = require("mongoose");

const journalLineSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
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

const journalEntrySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    referenceNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["normal", "adjusting"],
      default: "normal",
    },
    lines: {
      type: [journalLineSchema],
      validate: [
        {
          validator: function (lines) {
            return lines && lines.length > 0;
          },
          message: "At least one line is required",
        },
        {
          validator: function (lines) {
            const totalDebit = lines.reduce(
              (sum, l) => sum + (l.debit || 0),
              0,
            );
            const totalCredit = lines.reduce(
              (sum, l) => sum + (l.credit || 0),
              0,
            );
            return Math.abs(totalDebit - totalCredit) < 0.01;
          },
          message: "Total debits must equal total credits",
        },
      ],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalDate: Date,
    attachments: [String],
    tags: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
