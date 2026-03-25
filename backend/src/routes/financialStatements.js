const express = require("express");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");
const FinancialStatement = require("../models/FinancialStatement");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Generate financial statements (Income Statement & Balance Sheet)
router.post("/generate/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.body;

    const accounts = await Account.find({ isActive: true });
    const journalEntries = await JournalEntry.find({
      company: companyId,
      date: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
    }).populate("lines.account");

    // Calculate balances for all accounts
    const accountBalances = {};

    accounts.forEach((account) => {
      accountBalances[account._id.toString()] = {
        account: account._id,
        code: account.code,
        name: account.name,
        type: account.type,
        category: account.category,
        normalBalance: account.normalBalance,
        debitBalance: account.openingBalance || 0,
        creditBalance: 0,
      };
    });

    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const key = line.account._id.toString();
        if (accountBalances[key]) {
          accountBalances[key].debitBalance += line.debit;
          accountBalances[key].creditBalance += line.credit;
        }
      });
    });

    // Prepare income statement
    const revenues = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    // Prepare balance sheet
    const currentAssets = [];
    const noncurrentAssets = [];
    const currentLiabilities = [];
    const noncurrentLiabilities = [];
    const equityAccounts = [];

    let totalCurrentAssets = 0;
    let totalNoncurrentAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalNoncurrentLiabilities = 0;
    let totalEquity = 0;

    // Process accounts
    Object.values(accountBalances).forEach((acc) => {
      let balance =
        acc.normalBalance === "debit"
          ? acc.debitBalance - acc.creditBalance
          : acc.creditBalance - acc.debitBalance;
      balance = Math.round(balance * 100) / 100;

      if (acc.type === "revenue") {
        revenues.push({
          category: "Revenue",
          account: acc.account,
          accountCode: acc.code,
          accountName: acc.name,
          amount: balance,
          parentCategory: acc.category,
        });
        totalRevenue += balance;
      } else if (acc.type === "expense") {
        expenses.push({
          category: "Expense",
          account: acc.account,
          accountCode: acc.code,
          accountName: acc.name,
          amount: balance,
          parentCategory: acc.category,
        });
        totalExpenses += balance;
      } else if (acc.type === "asset") {
        const item = {
          category: "Asset",
          subcategory: acc.category,
          account: acc.account,
          accountCode: acc.code,
          accountName: acc.name,
          amount: balance,
        };

        if (acc.category === "current-asset") {
          currentAssets.push(item);
          totalCurrentAssets += balance;
        } else {
          noncurrentAssets.push(item);
          totalNoncurrentAssets += balance;
        }
      } else if (acc.type === "liability") {
        const item = {
          category: "Liability",
          subcategory: acc.category,
          account: acc.account,
          accountCode: acc.code,
          accountName: acc.name,
          amount: balance,
        };

        if (acc.category === "current-liability") {
          currentLiabilities.push(item);
          totalCurrentLiabilities += balance;
        } else {
          noncurrentLiabilities.push(item);
          totalNoncurrentLiabilities += balance;
        }
      } else if (acc.type === "equity") {
        equityAccounts.push({
          category: "Equity",
          subcategory: acc.category,
          account: acc.account,
          accountCode: acc.code,
          accountName: acc.name,
          amount: balance,
        });
        totalEquity += balance;
      }
    });

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    const netIncome = Math.round((totalRevenue - totalExpenses) * 100) / 100;

    totalCurrentAssets = Math.round(totalCurrentAssets * 100) / 100;
    totalNoncurrentAssets = Math.round(totalNoncurrentAssets * 100) / 100;
    const totalAssets =
      Math.round((totalCurrentAssets + totalNoncurrentAssets) * 100) / 100;

    totalCurrentLiabilities = Math.round(totalCurrentLiabilities * 100) / 100;
    totalNoncurrentLiabilities =
      Math.round(totalNoncurrentLiabilities * 100) / 100;
    const totalLiabilities =
      Math.round((totalCurrentLiabilities + totalNoncurrentLiabilities) * 100) /
      100;

    totalEquity = Math.round(totalEquity * 100) / 100;
    const totalLiabilitiesAndEquity =
      Math.round((totalLiabilities + totalEquity) * 100) / 100;

    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    const statement = await FinancialStatement.create({
      company: companyId,
      period: {
        startDate: new Date(periodStart),
        endDate: new Date(periodEnd),
      },
      revenues,
      totalRevenue,
      expenses,
      totalExpenses,
      netIncome,
      assets: {
        current: currentAssets,
        noncurrent: noncurrentAssets,
      },
      totalCurrentAssets,
      totalNoncurrentAssets,
      totalAssets,
      liabilities: {
        current: currentLiabilities,
        noncurrent: noncurrentLiabilities,
      },
      totalCurrentLiabilities,
      totalNoncurrentLiabilities,
      totalLiabilities,
      equity: equityAccounts,
      totalEquity,
      accountingEquation: {
        assetsTotal: totalAssets,
        liabilitiesAndEquityTotal: totalLiabilitiesAndEquity,
        isBalanced,
      },
    });

    res.status(201).json(statement);
  } catch (err) {
    console.error("Generate financial statements error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get financial statements for company
router.get("/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const statements = await FinancialStatement.find({ company: companyId })
      .populate("revenues.account")
      .populate("expenses.account")
      .populate("assets.current.account")
      .populate("assets.noncurrent.account")
      .populate("liabilities.current.account")
      .populate("liabilities.noncurrent.account")
      .populate("equity.account")
      .sort({ createdAt: -1 });

    res.json(statements);
  } catch (err) {
    console.error("Get financial statements error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single financial statement
router.get("/view/:id", async (req, res) => {
  try {
    const statement = await FinancialStatement.findById(req.params.id)
      .populate("revenues.account")
      .populate("expenses.account")
      .populate("assets.current.account")
      .populate("assets.noncurrent.account")
      .populate("liabilities.current.account")
      .populate("liabilities.noncurrent.account")
      .populate("equity.account");

    if (!statement) {
      return res.status(404).json({ message: "Financial statement not found" });
    }

    res.json(statement);
  } catch (err) {
    console.error("Get financial statement error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
