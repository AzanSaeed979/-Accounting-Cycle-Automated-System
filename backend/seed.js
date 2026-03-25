require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Company = require("./src/models/Company");
const Account = require("./src/models/Account");
const JournalEntry = require("./src/models/JournalEntry");
const bcrypt = require("bcrypt");

const connectDB = require("./src/config/db");

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Company.deleteMany({});
    await Account.deleteMany({});
    await JournalEntry.deleteMany({});

    // Create users
    console.log("Creating users...");
    const adminPassword = await bcrypt.hash("admin123", 10);
    const accountantPassword = await bcrypt.hash("accountant123", 10);

    const admin = await User.create({
      name: "Admin User",
      email: "admin@techsolutions.com",
      passwordHash: adminPassword,
      role: "admin",
    });

    const accountant = await User.create({
      name: "John Accountant",
      email: "john@techsolutions.com",
      passwordHash: accountantPassword,
      role: "accountant",
    });

    console.log("Users created:", admin._id, accountant._id);

    // Create company
    console.log("Creating company...");
    const company = await Company.create({
      name: "Tech Solutions Inc.",
      businessType: "software-house",
      registrationNumber: "TSI-2024-001",
      taxId: "TAX123456789",
      address: {
        street: "123 Tech Street",
        city: "San Francisco",
        state: "California",
        postalCode: "94102",
        country: "United States",
      },
      contactEmail: "info@techsolutions.com",
      contactPhone: "+1-415-555-0100",
      websiteUrl: "https://www.techsolutions.com",
      currency: "USD",
      description:
        "Leading Software House specializing in custom development and IT services",
      stakeholders: [
        {
          name: "Sarah Johnson",
          role: "CEO & Founder",
          email: "sarah@techsolutions.com",
          phone: "+1-415-555-0101",
          ownership_percentage: 50,
        },
        {
          name: "Michael Chen",
          role: "CTO & Co-Founder",
          email: "michael@techsolutions.com",
          phone: "+1-415-555-0102",
          ownership_percentage: 50,
        },
      ],
      accountingPeriodStart: new Date("2024-01-01"),
      accountingPeriodEnd: new Date("2024-12-31"),
    });

    console.log("Company created:", company._id);

    // Create Chart of Accounts for Software House
    console.log("Creating chart of accounts...");
    const accountsData = [
      // ASSETS - Current Assets
      {
        code: "1010",
        name: "Cash and Cash Equivalents",
        type: "asset",
        category: "current-asset",
        normalBalance: "debit",
        openingBalance: 50000,
      },
      {
        code: "1020",
        name: "Accounts Receivable",
        type: "asset",
        category: "current-asset",
        normalBalance: "debit",
        openingBalance: 75000,
      },
      {
        code: "1030",
        name: "Allowance for Doubtful Accounts",
        type: "asset",
        category: "current-asset",
        normalBalance: "credit",
        openingBalance: -2000,
      },
      {
        code: "1040",
        name: "Prepaid Expenses",
        type: "asset",
        category: "current-asset",
        normalBalance: "debit",
        openingBalance: 5000,
      },
      {
        code: "1050",
        name: "Inventory - Software Licenses",
        type: "asset",
        category: "current-asset",
        normalBalance: "debit",
        openingBalance: 15000,
      },

      // ASSETS - Non-Current Assets
      {
        code: "1510",
        name: "Property and Equipment",
        type: "asset",
        category: "noncurrent-asset",
        normalBalance: "debit",
        openingBalance: 200000,
      },
      {
        code: "1520",
        name: "Accumulated Depreciation",
        type: "asset",
        category: "noncurrent-asset",
        normalBalance: "credit",
        openingBalance: -40000,
      },
      {
        code: "1530",
        name: "Software Development Tools",
        type: "asset",
        category: "noncurrent-asset",
        normalBalance: "debit",
        openingBalance: 50000,
      },
      {
        code: "1540",
        name: "Accumulated Amortization - Software",
        type: "asset",
        category: "noncurrent-asset",
        normalBalance: "credit",
        openingBalance: -10000,
      },

      // LIABILITIES - Current Liabilities
      {
        code: "2010",
        name: "Accounts Payable",
        type: "liability",
        category: "current-liability",
        normalBalance: "credit",
        openingBalance: 20000,
      },
      {
        code: "2020",
        name: "Accrued Salaries and Wages",
        type: "liability",
        category: "current-liability",
        normalBalance: "credit",
        openingBalance: 15000,
      },
      {
        code: "2030",
        name: "Short-term Debt",
        type: "liability",
        category: "current-liability",
        normalBalance: "credit",
        openingBalance: 30000,
      },
      {
        code: "2040",
        name: "Deferred Revenue",
        type: "liability",
        category: "current-liability",
        normalBalance: "credit",
        openingBalance: 5000,
      },

      // LIABILITIES - Non-Current Liabilities
      {
        code: "2510",
        name: "Long-term Debt",
        type: "liability",
        category: "noncurrent-liability",
        normalBalance: "credit",
        openingBalance: 100000,
      },

      // EQUITY
      {
        code: "3010",
        name: "Common Stock",
        type: "equity",
        category: "capital-equity",
        normalBalance: "credit",
        openingBalance: 150000,
      },
      {
        code: "3020",
        name: "Additional Paid-in Capital",
        type: "equity",
        category: "capital-equity",
        normalBalance: "credit",
        openingBalance: 50000,
      },
      {
        code: "3100",
        name: "Retained Earnings",
        type: "equity",
        category: "retained-earnings",
        normalBalance: "credit",
        openingBalance: 193000,
      },

      // REVENUE
      {
        code: "4010",
        name: "Software Development Revenue",
        type: "revenue",
        category: "operating-revenue",
        normalBalance: "credit",
      },
      {
        code: "4020",
        name: "IT Consulting Services",
        type: "revenue",
        category: "operating-revenue",
        normalBalance: "credit",
      },
      {
        code: "4030",
        name: "Software Maintenance and Support",
        type: "revenue",
        category: "operating-revenue",
        normalBalance: "credit",
      },
      {
        code: "4040",
        name: "Training and Documentation Services",
        type: "revenue",
        category: "operating-revenue",
        normalBalance: "credit",
      },
      {
        code: "4100",
        name: "Interest Revenue",
        type: "revenue",
        category: "nonoperating-revenue",
        normalBalance: "credit",
      },

      // EXPENSES - Operating Expenses
      {
        code: "5010",
        name: "Salaries and Wages",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5020",
        name: "Payroll Taxes and Benefits",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5030",
        name: "Office Rent",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5040",
        name: "Utilities",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5050",
        name: "Office Supplies",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5060",
        name: "Software Licenses and Subscriptions",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5070",
        name: "Depreciation Expense",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5080",
        name: "Amortization Expense",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5090",
        name: "Marketing and Advertising",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5100",
        name: "Professional Services",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5110",
        name: "Travel and Meals",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5120",
        name: "Training and Development",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5130",
        name: "Equipment Maintenance",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },
      {
        code: "5140",
        name: "Insurance",
        type: "expense",
        category: "operating-expense",
        normalBalance: "debit",
      },

      // EXPENSES - Non-Operating Expenses
      {
        code: "5510",
        name: "Interest Expense",
        type: "expense",
        category: "nonoperating-expense",
        normalBalance: "debit",
      },
      {
        code: "5520",
        name: "Miscellaneous Expense",
        type: "expense",
        category: "nonoperating-expense",
        normalBalance: "debit",
      },
    ];

    const createdAccounts = [];
    for (const accountData of accountsData) {
      const account = await Account.create(accountData);
      createdAccounts.push(account);
    }

    console.log(
      "Chart of Accounts created:",
      createdAccounts.length,
      "accounts",
    );

    // Create sample journal entries
    console.log("Creating sample journal entries...");

    // Sample 1: Service Revenue
    const revenueEntry = await JournalEntry.create({
      company: company._id,
      date: new Date("2024-01-15"),
      referenceNumber: "JE-001",
      description: "Received payment for software development services",
      type: "normal",
      lines: [
        { account: createdAccounts[0]._id, debit: 10000, credit: 0 }, // Cash
        { account: createdAccounts[13]._id, debit: 0, credit: 10000 }, // Software Development Revenue
      ],
      createdBy: accountant._id,
      isApproved: true,
      approvedBy: admin._id,
      approvalDate: new Date("2024-01-15"),
    });

    // Sample 2: Salary Expense
    const salaryEntry = await JournalEntry.create({
      company: company._id,
      date: new Date("2024-01-31"),
      referenceNumber: "JE-002",
      description: "Monthly salary payment to employees",
      type: "normal",
      lines: [
        { account: createdAccounts[25]._id, debit: 20000, credit: 0 }, // Salaries and Wages
        { account: createdAccounts[0]._id, debit: 0, credit: 20000 }, // Cash
      ],
      createdBy: accountant._id,
      isApproved: true,
      approvedBy: admin._id,
      approvalDate: new Date("2024-01-31"),
    });

    // Sample 3: Office Rent
    const rentEntry = await JournalEntry.create({
      company: company._id,
      date: new Date("2024-02-01"),
      referenceNumber: "JE-003",
      description: "Monthly office rent payment",
      type: "normal",
      lines: [
        { account: createdAccounts[27]._id, debit: 5000, credit: 0 }, // Office Rent
        { account: createdAccounts[0]._id, debit: 0, credit: 5000 }, // Cash
      ],
      createdBy: accountant._id,
      isApproved: true,
      approvedBy: admin._id,
      approvalDate: new Date("2024-02-01"),
    });

    // Sample 4: IT Consulting Revenue
    const consultingEntry = await JournalEntry.create({
      company: company._id,
      date: new Date("2024-02-10"),
      referenceNumber: "JE-004",
      description: "Invoiced IT consulting services to client",
      type: "normal",
      lines: [
        { account: createdAccounts[1]._id, debit: 8000, credit: 0 }, // Accounts Receivable
        { account: createdAccounts[14]._id, debit: 0, credit: 8000 }, // IT Consulting Services
      ],
      createdBy: accountant._id,
      isApproved: true,
      approvedBy: admin._id,
      approvalDate: new Date("2024-02-10"),
    });

    console.log("Sample journal entries created:", 4);

    console.log("\n✓ Database seeded successfully!");
    console.log("\nCompany ID:", company._id);
    console.log("Admin User:", admin.email, "(Password: admin123)");
    console.log(
      "Accountant User:",
      accountant.email,
      "(Password: accountant123)",
    );
    console.log(
      "Chart of Accounts:",
      createdAccounts.length,
      "accounts created",
    );
    console.log("Sample Journal Entries:", 4, "entries created");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
