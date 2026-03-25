const express = require("express");
const JournalEntry = require("../models/JournalEntry");
const Account = require("../models/Account");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Get journal entries for company
router.get("/", async (req, res) => {
  try {
    const { companyId, type, startDate, endDate } = req.query;
    const query = {};

    // Only add company filter if companyId is provided and not "all"
    if (companyId && companyId !== 'all') {
      query.company = companyId;
    }
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(query)
      .populate("lines.account")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1, createdAt: -1 });

    res.json(entries);
  } catch (err) {
    console.error("Get journal entries error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single journal entry
router.get("/:id", async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id)
      .populate("lines.account")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.json(entry);
  } catch (err) {
    console.error("Get journal entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create journal entry
router.post("/", async (req, res) => {
  try {
    const { company, date, referenceNumber, description, type, lines } =
      req.body;

    if (
      !company ||
      !date ||
      !description ||
      !lines ||
      !Array.isArray(lines) ||
      lines.length === 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Company, date, description, and at least one line are required",
        });
    }

    // Validate all accounts exist
    const accountIds = lines.map((l) => l.account);
    const distinctAccountIds = [...new Set(accountIds.map(String))];
    const accounts = await Account.find({ _id: { $in: distinctAccountIds } });

    if (accounts.length !== distinctAccountIds.length) {
      return res
        .status(400)
        .json({ message: "One or more accounts are invalid" });
    }

    // Validate debits equal credits
    const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return res
        .status(400)
        .json({ message: "Total debits must equal total credits" });
    }

    // Validate each line has either debit or credit, not both
    for (const line of lines) {
      const hasDebit = line.debit && line.debit > 0;
      const hasCredit = line.credit && line.credit > 0;
      
      if (hasDebit && hasCredit) {
        return res
          .status(400)
          .json({ 
            message: "Each line cannot have both debit and credit amounts" 
          });
      }
      
      if (!hasDebit && !hasCredit) {
        return res
          .status(400)
          .json({ 
            message: "Each line must have either a debit or credit amount" 
          });
      }
    }

    const entry = await JournalEntry.create({
      company,
      date,
      referenceNumber,
      description,
      type: type || "normal",
      lines,
      createdBy: req.user.userId,
    });

    const populated = await JournalEntry.findById(entry._id)
      .populate("lines.account")
      .populate("createdBy", "name email");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create journal entry error:", err.message);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Update journal entry
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, referenceNumber, description, lines } = req.body;

    const entry = await JournalEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.isApproved) {
      return res
        .status(400)
        .json({ message: "Cannot edit approved journal entries" });
    }

    // Validate debits equal credits if lines are updated
    if (lines) {
      const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return res
          .status(400)
          .json({ message: "Total debits must equal total credits" });
      }

      // Validate each line has either debit or credit, not both
      for (const line of lines) {
        const hasDebit = line.debit && line.debit > 0;
        const hasCredit = line.credit && line.credit > 0;
        
        if (hasDebit && hasCredit) {
          return res
            .status(400)
            .json({ 
              message: "Each line cannot have both debit and credit amounts" 
            });
        }
        
        if (!hasDebit && !hasCredit) {
          return res
            .status(400)
            .json({ 
              message: "Each line must have either a debit or credit amount" 
            });
        }
      }
    }

    const updated = await JournalEntry.findByIdAndUpdate(
      id,
      { date, referenceNumber, description, lines },
      { new: true },
    )
      .populate("lines.account")
      .populate("createdBy", "name email");

    res.json(updated);
  } catch (err) {
    console.error("Update journal entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve journal entry
router.post("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JournalEntry.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        approvedBy: req.user.userId,
        approvalDate: new Date(),
      },
      { new: true },
    )
      .populate("lines.account")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.json(entry);
  } catch (err) {
    console.error("Approve journal entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete journal entry
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JournalEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.isApproved) {
      return res
        .status(400)
        .json({ message: "Cannot delete approved journal entries" });
    }

    await JournalEntry.findByIdAndDelete(id);
    res.json({ message: "Journal entry deleted" });
  } catch (err) {
    console.error("Delete journal entry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
