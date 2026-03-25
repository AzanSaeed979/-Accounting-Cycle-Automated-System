const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        // Assets
        "current-asset",
        "noncurrent-asset",
        "tangible-asset",
        "intangible-asset",
        // Liabilities
        "current-liability",
        "noncurrent-liability",
        // Equity
        "capital-equity",
        "retained-earnings",
        // Revenue
        "operating-revenue",
        "nonoperating-revenue",
        // Expense
        "operating-expense",
        "nonoperating-expense",
        "cost-of-revenue",
      ],
    },
    subcategory: String,
    description: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    normalBalance: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isHeaderAccount: {
      type: Boolean,
      default: false,
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Account", accountSchema);
