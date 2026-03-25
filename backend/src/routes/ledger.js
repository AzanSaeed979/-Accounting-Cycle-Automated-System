const express = require("express");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");
const Ledger = require("../models/Ledger");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Post journal entries to ledger
router.post("/post/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.body;

    const accounts = await Account.find({ isActive: true });
    const journalEntries = await JournalEntry.find({
      company: companyId,
      date: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
    }).populate("lines.account");

    // Clear existing ledger entries for this period
    await Ledger.deleteMany({
      account: { $in: accounts.map((a) => a._id) },
      "entries.date": {
        $gte: new Date(periodStart),
        $lte: new Date(periodEnd),
      },
    });

    // Create/update ledger entries
    for (const account of accounts) {
      const ledgerEntries = [];
      let balance = account.openingBalance || 0;

      journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.account._id.toString() === account._id.toString()) {
            const debitAmount = line.debit || 0;
            const creditAmount = line.credit || 0;

            if (account.normalBalance === "debit") {
              balance += debitAmount - creditAmount;
            } else {
              balance += creditAmount - debitAmount;
            }

            ledgerEntries.push({
              journalEntry: entry._id,
              date: entry.date,
              description: entry.description,
              debit: debitAmount,
              credit: creditAmount,
              balance: Math.round(balance * 100) / 100,
              balanceType: balance >= 0 ? "debit" : "credit",
            });
          }
        });
      });

      if (
        ledgerEntries.length > 0 ||
        (account.openingBalance && account.openingBalance !== 0)
      ) {
        const existingLedger = await Ledger.findOne({ account: account._id });

        if (existingLedger) {
          existingLedger.entries = ledgerEntries;
          existingLedger.openingBalance = account.openingBalance || 0;
          existingLedger.closingBalance = balance;
          existingLedger.balanceType =
            balance >= 0
              ? account.normalBalance
              : account.normalBalance === "debit"
                ? "credit"
                : "debit";
          await existingLedger.save();
        } else {
          await Ledger.create({
            account: account._id,
            entries: ledgerEntries,
            openingBalance: account.openingBalance || 0,
            closingBalance: balance,
            balanceType:
              balance >= 0
                ? account.normalBalance
                : account.normalBalance === "debit"
                  ? "credit"
                  : "debit",
          });
        }
      }
    }

    res.json({ message: "Ledger posted successfully" });
  } catch (err) {
    console.error("Post to ledger error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ledger for specific account
router.get("/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const ledger = await Ledger.findOne({ account: accountId })
      .populate("account")
      .populate("entries.journalEntry");

    if (!ledger) {
      return res.status(404).json({ message: "Ledger not found" });
    }

    res.json(ledger);
  } catch (err) {
    console.error("Get ledger error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all ledgers for company
router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const accounts = await Account.find({ isActive: true });
    const ledgers = await Ledger.find({
      account: { $in: accounts.map((a) => a._id) },
    })
      .populate("account")
      .sort("account.code");

    res.json(ledgers);
  } catch (err) {
    console.error("Get ledgers error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
