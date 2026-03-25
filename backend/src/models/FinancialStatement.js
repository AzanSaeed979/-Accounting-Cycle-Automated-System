const mongoose = require("mongoose");

const incomeStatementLineSchema = new mongoose.Schema(
  {
    category: String,
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    accountCode: String,
    accountName: String,
    amount: Number,
    parentCategory: String,
  },
  { _id: false },
);

const balanceSheetLineSchema = new mongoose.Schema(
  {
    category: String,
    subcategory: String,
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    accountCode: String,
    accountName: String,
    amount: Number,
  },
  { _id: false },
);

const financialStatementSchema = new mongoose.Schema(
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
    // Income Statement
    revenues: {
      type: [incomeStatementLineSchema],
      default: [],
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    expenses: {
      type: [incomeStatementLineSchema],
      default: [],
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    netIncome: {
      type: Number,
      default: 0,
    },

    // Balance Sheet
    assets: {
      current: [balanceSheetLineSchema],
      noncurrent: [balanceSheetLineSchema],
    },
    totalCurrentAssets: {
      type: Number,
      default: 0,
    },
    totalNoncurrentAssets: {
      type: Number,
      default: 0,
    },
    totalAssets: {
      type: Number,
      default: 0,
    },

    liabilities: {
      current: [balanceSheetLineSchema],
      noncurrent: [balanceSheetLineSchema],
    },
    totalCurrentLiabilities: {
      type: Number,
      default: 0,
    },
    totalNoncurrentLiabilities: {
      type: Number,
      default: 0,
    },
    totalLiabilities: {
      type: Number,
      default: 0,
    },

    equity: [balanceSheetLineSchema],
    totalEquity: {
      type: Number,
      default: 0,
    },

    // Verification
    accountingEquation: {
      assetsTotal: Number,
      liabilitiesAndEquityTotal: Number,
      isBalanced: Boolean,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FinancialStatement", financialStatementSchema);
