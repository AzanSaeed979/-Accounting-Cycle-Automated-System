const express = require("express");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");
const TrialBalance = require("../models/TrialBalance");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Generate unadjusted trial balance
router.post("/generate-unadjusted/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.body;

    const accounts = await Account.find({ isActive: true });
    const journalEntries = await JournalEntry.find({
      company: companyId,
      type: "normal",
      date: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
    }).populate("lines.account");

    const items = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      let debit = account.openingBalance || 0;
      let credit = 0;

      // Aggregate journal entries for this account
      journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.account._id.toString() === account._id.toString()) {
            if (account.normalBalance === "debit") {
              debit += line.debit - line.credit;
            } else {
              credit += line.credit - line.debit;
            }
          }
        });
      });

      // Only include accounts with balance or those explicitly created
      if (debit !== 0 || credit !== 0 || account.openingBalance !== 0) {
        items.push({
          account: account._id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debit: Math.max(0, debit),
          credit: Math.max(0, credit),
        });

        if (debit > 0) totalDebits += debit;
        if (credit > 0) totalCredits += credit;
      }
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const trialBalance = await TrialBalance.create({
      company: companyId,
      period: {
        startDate: new Date(periodStart),
        endDate: new Date(periodEnd),
      },
      type: "unadjusted",
      items,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isBalanced,
    });

    res.status(201).json(trialBalance);
  } catch (err) {
    console.error("Generate trial balance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate adjusted trial balance
router.post("/generate-adjusted/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.body;

    const accounts = await Account.find({ isActive: true });
    const journalEntries = await JournalEntry.find({
      company: companyId,
      date: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
    }).populate("lines.account");

    const items = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      let debit = account.openingBalance || 0;
      let credit = 0;

      // Aggregate all journal entries (normal + adjusting)
      journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.account._id.toString() === account._id.toString()) {
            if (account.normalBalance === "debit") {
              debit += line.debit - line.credit;
            } else {
              credit += line.credit - line.debit;
            }
          }
        });
      });

      if (debit !== 0 || credit !== 0 || account.openingBalance !== 0) {
        items.push({
          account: account._id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debit: Math.max(0, debit),
          credit: Math.max(0, credit),
        });

        if (debit > 0) totalDebits += debit;
        if (credit > 0) totalCredits += credit;
      }
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const trialBalance = await TrialBalance.create({
      company: companyId,
      period: {
        startDate: new Date(periodStart),
        endDate: new Date(periodEnd),
      },
      type: "adjusted",
      items,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isBalanced,
    });

    res.status(201).json(trialBalance);
  } catch (err) {
    console.error("Generate adjusted trial balance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get trial balances for company
router.get("/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type } = req.query;

    const query = { company: companyId };
    if (type) query.type = type;

    const trialBalances = await TrialBalance.find(query)
      .populate("items.account")
      .sort({ createdAt: -1 });

    res.json(trialBalances);
  } catch (err) {
    console.error("Get trial balances error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single trial balance
router.get("/view/:id", async (req, res) => {
  try {
    const trialBalance = await TrialBalance.findById(req.params.id).populate(
      "items.account",
    );

    if (!trialBalance) {
      return res.status(404).json({ message: "Trial balance not found" });
    }

    res.json(trialBalance);
  } catch (err) {
    console.error("Get trial balance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
