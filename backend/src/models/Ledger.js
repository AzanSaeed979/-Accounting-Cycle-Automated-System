const mongoose = require("mongoose");

const ledgerEntrySchema = new mongoose.Schema(
  {
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: String,
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
    balance: {
      type: Number,
      default: 0,
    },
    balanceType: {
      type: String,
      enum: ["debit", "credit"],
    },
  },
  { _id: false },
);

const ledgerSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    entries: [ledgerEntrySchema],
    openingBalance: {
      type: Number,
      default: 0,
    },
    closingBalance: {
      type: Number,
      default: 0,
    },
    balanceType: {
      type: String,
      enum: ["debit", "credit"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ledger", ledgerSchema);
