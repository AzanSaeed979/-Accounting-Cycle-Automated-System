const express = require("express");
const Account = require("../models/Account");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Get accounts by company or all
router.get("/", async (req, res) => {
  try {
    const { type, category } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;

    const accounts = await Account.find(query)
      .populate("parentAccount")
      .sort({ code: 1 });
    res.json(accounts);
  } catch (err) {
    console.error("Get accounts error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get account by ID
router.get("/:id", async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).populate(
      "parentAccount",
    );

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json(account);
  } catch (err) {
    console.error("Get account error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create account
router.post("/", async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      category,
      subcategory,
      description,
      normalBalance,
      openingBalance,
      isHeaderAccount,
      parentAccount,
    } = req.body;

    if (!code || !name || !type || !category || !normalBalance) {
      return res
        .status(400)
        .json({
          message: "Code, name, type, category, and normalBalance are required",
        });
    }

    const existing = await Account.findOne({ code });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Account with this code already exists" });
    }

    const account = await Account.create({
      code,
      name,
      type,
      category,
      subcategory,
      description,
      normalBalance,
      openingBalance: openingBalance || 0,
      isHeaderAccount: isHeaderAccount || false,
      parentAccount,
    });

    const populated = await account.populate("parentAccount");
    res.status(201).json(populated);
  } catch (err) {
    console.error("Create account error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update account
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, openingBalance, normalBalance } =
      req.body;

    const account = await Account.findByIdAndUpdate(
      id,
      { name, description, isActive, openingBalance, normalBalance },
      { new: true },
    ).populate("parentAccount");

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json(account);
  } catch (err) {
    console.error("Update account error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete account (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const account = await Account.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ message: "Account deactivated" });
  } catch (err) {
    console.error("Delete account error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
