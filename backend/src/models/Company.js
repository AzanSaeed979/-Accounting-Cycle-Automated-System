const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      enum: [
        "software-house",
        "it-services",
        "freelancing-agency",
        "app-development",
        "computer-services",
      ],
      default: "software-house",
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    taxId: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: String,
    websiteUrl: String,
    fiscalYearStart: {
      month: { type: Number, min: 1, max: 12, default: 1 },
      day: { type: Number, min: 1, max: 31, default: 1 },
    },
    currency: {
      type: String,
      default: "USD",
    },
    description: String,
    stakeholders: [
      {
        name: String,
        role: String,
        email: String,
        phone: String,
        ownership_percentage: Number,
      },
    ],
    accountingPeriodStart: {
      type: Date,
      required: true,
    },
    accountingPeriodEnd: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Company", companySchema);
