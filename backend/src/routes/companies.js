const express = require("express");
const Company = require("../models/Company");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Get all companies
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    console.error("Get companies error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single company
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  } catch (err) {
    console.error("Get company error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create company
router.post("/", async (req, res) => {
  try {
    const {
      name,
      businessType,
      registrationNumber,
      taxId,
      address,
      contactEmail,
      contactPhone,
      websiteUrl,
      fiscalYearStart,
      currency,
      description,
      stakeholders,
      accountingPeriodStart,
      accountingPeriodEnd,
    } = req.body;

    if (!name || !registrationNumber || !taxId || !contactEmail) {
      return res
        .status(400)
        .json({
          message:
            "Name, registration number, tax ID, and contact email are required",
        });
    }

    const existingReg = await Company.findOne({ registrationNumber });
    if (existingReg) {
      return res
        .status(409)
        .json({ message: "Registration number already exists" });
    }

    const existingTax = await Company.findOne({ taxId });
    if (existingTax) {
      return res.status(409).json({ message: "Tax ID already exists" });
    }

    const company = await Company.create({
      name,
      businessType: businessType || "software-house",
      registrationNumber,
      taxId,
      address,
      contactEmail,
      contactPhone,
      websiteUrl,
      fiscalYearStart: fiscalYearStart || { month: 1, day: 1 },
      currency: currency || "USD",
      description,
      stakeholders: stakeholders || [],
      accountingPeriodStart,
      accountingPeriodEnd,
    });

    res.status(201).json(company);
  } catch (err) {
    console.error("Create company error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update company
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      businessType,
      address,
      contactEmail,
      contactPhone,
      websiteUrl,
      currency,
      description,
      stakeholders,
      accountingPeriodStart,
      accountingPeriodEnd,
      isActive,
    } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      {
        name,
        businessType,
        address,
        contactEmail,
        contactPhone,
        websiteUrl,
        currency,
        description,
        stakeholders,
        accountingPeriodStart,
        accountingPeriodEnd,
        isActive,
      },
      { new: true },
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (err) {
    console.error("Update company error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete company
router.delete("/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({ message: "Company deleted successfully" });
  } catch (err) {
    console.error("Delete company error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
