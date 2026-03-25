const express = require("express");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Get Ledger for specific account (automatically from journal entries)
router.get("/ledger/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, companyId } = req.query;

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Build query - only add company filter if companyId is provided and not "all"
    const jeQuery = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      "lines.account": accountId,
    };
    if (companyId && companyId !== 'all') {
      jeQuery.company = companyId;
    }

    // Get all journal entries for this account
    const journalEntries = await JournalEntry.find(jeQuery)
      .populate("lines.account")
      .populate("company", "name")
      .sort({ date: 1, createdAt: 1 });

    // Build ledger entries
    let runningBalance = account.openingBalance || 0;
    const ledgerEntries = [];

    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (line.account._id.toString() === accountId) {
          const debit = line.debit || 0;
          const credit = line.credit || 0;

          // Calculate balance based on normal balance
          if (account.normalBalance === "debit") {
            runningBalance += debit - credit;
          } else {
            runningBalance += credit - debit;
          }

          ledgerEntries.push({
            date: entry.date,
            referenceNumber: entry.referenceNumber,
            description: entry.description,
            companyName: entry.company?.name || 'N/A',
            debit: debit,
            credit: credit,
            balance: runningBalance,
          });
        }
      });
    });

    res.json({
      account: {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      openingBalance: account.openingBalance || 0,
      entries: ledgerEntries,
      closingBalance: runningBalance,
    });
  } catch (err) {
    console.error("Get ledger error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Accounts Ledger (combined view)
router.get("/ledger-all-accounts", async (req, res) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    console.log('\n=== ALL ACCOUNTS LEDGER REQUEST ===');
    console.log('Date Range:', startDate, 'to', endDate);
    console.log('Company ID:', companyId);

    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
    console.log('Total Active Accounts:', accounts.length);

    // Build query - only add company filter if companyId is provided and not "all"
    const jeQuery = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (companyId && companyId !== 'all') {
      jeQuery.company = companyId;
    }

    const journalEntries = await JournalEntry.find(jeQuery)
      .populate("lines.account")
      .populate("company", "name")
      .sort({ date: 1, createdAt: 1 });

    console.log('Journal Entries Found:', journalEntries.length);

    // Build combined ledger entries with account information
    const allLedgerEntries = [];

    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const account = accounts.find(a => a._id.toString() === line.account._id.toString());
        if (account) {
          allLedgerEntries.push({
            date: entry.date,
            referenceNumber: entry.referenceNumber,
            description: entry.description,
            companyName: entry.company?.name || 'N/A',
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type,
            debit: line.debit || 0,
            credit: line.credit || 0,
          });
        }
      });
    });

    console.log('Total Ledger Entries:', allLedgerEntries.length);

    res.json({
      entries: allLedgerEntries,
      totalEntries: allLedgerEntries.length,
      accountsCount: accounts.length,
    });
  } catch (err) {
    console.error("Get all accounts ledger error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Trial Balance (automatically from journal entries)
router.get("/trial-balance", async (req, res) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
    
    // Build query - only add company filter if companyId is provided and not "all"
    const jeQuery = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (companyId && companyId !== 'all') {
      jeQuery.company = companyId;
    }
    
    const journalEntries = await JournalEntry.find(jeQuery).populate("lines.account");

    const trialBalance = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      let balance = account.openingBalance || 0;
      let totalDebit = 0;
      let totalCredit = 0;

      journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.account._id.toString() === account._id.toString()) {
            totalDebit += line.debit || 0;
            totalCredit += line.credit || 0;
          }
        });
      });

      // Calculate closing balance
      if (account.normalBalance === "debit") {
        balance += totalDebit - totalCredit;
      } else {
        balance += totalCredit - totalDebit;
      }

      // Only include accounts with activity or opening balance
      if (totalDebit > 0 || totalCredit > 0 || balance !== 0) {
        const debitBalance = balance >= 0 && account.normalBalance === "debit" ? Math.abs(balance) : 0;
        const creditBalance = balance >= 0 && account.normalBalance === "credit" ? Math.abs(balance) : 0;

        trialBalance.push({
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debit: debitBalance,
          credit: creditBalance,
        });

        totalDebits += debitBalance;
        totalCredits += creditBalance;
      }
    }

    res.json({
      accounts: trialBalance,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    });
  } catch (err) {
    console.error("Get trial balance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Income Statement (automatically from trial balance)
router.get("/income-statement", async (req, res) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    console.log('\n=== INCOME STATEMENT REQUEST ===');
    console.log('Date Range:', startDate, 'to', endDate);
    console.log('Company ID:', companyId);

    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
    console.log('Total Active Accounts:', accounts.length);
    
    // Build query - only add company filter if companyId is provided and not "all"
    const jeQuery = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (companyId && companyId !== 'all') {
      jeQuery.company = companyId;
    }
    
    const journalEntries = await JournalEntry.find(jeQuery).populate("lines.account");
    console.log('Journal Entries Found:', journalEntries.length);

    const revenues = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accounts) {
      if (account.type !== "revenue" && account.type !== "expense") continue;

      let balance = 0;
      let accountDebits = 0;
      let accountCredits = 0;

      journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.account._id.toString() === account._id.toString()) {
            accountDebits += line.debit || 0;
            accountCredits += line.credit || 0;
            
            if (account.normalBalance === "credit") {
              balance += (line.credit || 0) - (line.debit || 0);
            } else {
              balance += (line.debit || 0) - (line.credit || 0);
            }
          }
        });
      });

      if (accountDebits > 0 || accountCredits > 0) {
        console.log(`\nAccount: ${account.name} (${account.type})`);
        console.log(`  Normal Balance: ${account.normalBalance}`);
        console.log(`  Total Debits: $${accountDebits}`);
        console.log(`  Total Credits: $${accountCredits}`);
        console.log(`  Calculated Balance: $${balance}`);
      }

      if (balance !== 0) {
        const item = {
          accountCode: account.code,
          accountName: account.name,
          category: account.category,
          amount: Math.abs(balance),
        };

        if (account.type === "revenue") {
          revenues.push(item);
          totalRevenue += Math.abs(balance);
          console.log(`  ✅ Added to Revenue: $${Math.abs(balance)}`);
        } else {
          expenses.push(item);
          totalExpenses += Math.abs(balance);
          console.log(`  ✅ Added to Expenses: $${Math.abs(balance)}`);
        }
      } else if (accountDebits > 0 || accountCredits > 0) {
        console.log(`  ⚠️  Balance is $0 - NOT included in report`);
        console.log(`  ⚠️  This usually means same account on both debit and credit sides!`);
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    console.log('\n=== INCOME STATEMENT RESULTS ===');
    console.log('Total Revenue:', totalRevenue);
    console.log('Total Expenses:', totalExpenses);
    console.log('Net Income:', netIncome);
    console.log('Revenue Items:', revenues.length);
    console.log('Expense Items:', expenses.length);

    res.json({
      revenues,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      expenses,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
    });
  } catch (err) {
    console.error("Get income statement error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Balance Sheet (automatically from trial balance)
router.get("/balance-sheet", async (req, res) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    console.log('\n=== BALANCE SHEET REQUEST ===');
    console.log('Date Range:', startDate, 'to', endDate);
    console.log('Company ID:', companyId);

    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
    console.log('Total Active Accounts:', accounts.length);
    
    // Build query - only add company filter if companyId is provided and not "all"
    const jeQuery = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (companyId && companyId !== 'all') {
      jeQuery.company = companyId;
    }
    
    const journalEntries = await JournalEntry.find(jeQuery).populate("lines.account");
    console.log('Journal Entries Found:', journalEntries.length);

    const assets = [];
    const liabilities = [];
    const equity = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    // Calculate net income for equity section
    let netIncome = 0;
    console.log('\nCalculating Net Income for Equity...');
    for (const account of accounts) {
      if (account.type === "revenue" || account.type === "expense") {
        let balance = 0;
        journalEntries.forEach((entry) => {
          entry.lines.forEach((line) => {
            if (line.account._id.toString() === account._id.toString()) {
              if (account.normalBalance === "credit") {
                balance += (line.credit || 0) - (line.debit || 0);
              } else {
                balance += (line.debit || 0) - (line.credit || 0);
              }
            }
          });
        });
        if (account.type === "revenue") {
          netIncome += balance;
          if (balance !== 0) {
            console.log(`  Revenue: ${account.name} = $${balance}`);
          }
        } else {
          netIncome -= balance;
          if (balance !== 0) {
            console.log(`  Expense: ${account.name} = $${balance}`);
          }
        }
      }
    }
    console.log(`Net Income: $${netIncome}`);

    console.log('\nProcessing Balance Sheet Accounts...');
    for (const account of accounts) {
      if (!["asset", "liability", "equity"].includes(account.type)) continue;

      let balance = account.openingBalance || 0;
      let accountDebits = 0;
      let accountCredits = 0;

      journalEntries.forEach((entry) => {
        entry.lines.forEach((line) => {
          if (line.account._id.toString() === account._id.toString()) {
            accountDebits += line.debit || 0;
            accountCredits += line.credit || 0;
            
            if (account.normalBalance === "debit") {
              balance += (line.debit || 0) - (line.credit || 0);
            } else {
              balance += (line.credit || 0) - (line.debit || 0);
            }
          }
        });
      });

      if (accountDebits > 0 || accountCredits > 0 || balance !== 0) {
        console.log(`\nAccount: ${account.name} (${account.type})`);
        console.log(`  Opening Balance: $${account.openingBalance || 0}`);
        console.log(`  Total Debits: $${accountDebits}`);
        console.log(`  Total Credits: $${accountCredits}`);
        console.log(`  Closing Balance: $${balance}`);
      }

      if (balance !== 0) {
        const item = {
          accountCode: account.code,
          accountName: account.name,
          category: account.category,
          amount: Math.abs(balance),
        };

        if (account.type === "asset") {
          assets.push(item);
          totalAssets += Math.abs(balance);
          console.log(`  ✅ Added to Assets: $${Math.abs(balance)}`);
        } else if (account.type === "liability") {
          liabilities.push(item);
          totalLiabilities += Math.abs(balance);
          console.log(`  ✅ Added to Liabilities: $${Math.abs(balance)}`);
        } else if (account.type === "equity") {
          equity.push(item);
          totalEquity += Math.abs(balance);
          console.log(`  ✅ Added to Equity: $${Math.abs(balance)}`);
        }
      } else if (accountDebits > 0 || accountCredits > 0) {
        console.log(`  ⚠️  Balance is $0 - NOT included in report`);
      }
    }

    // Add net income to equity
    totalEquity += netIncome;

    console.log('\n=== BALANCE SHEET RESULTS ===');
    console.log('Total Assets:', totalAssets);
    console.log('Total Liabilities:', totalLiabilities);
    console.log('Total Equity (before net income):', totalEquity - netIncome);
    console.log('Net Income:', netIncome);
    console.log('Total Equity (after net income):', totalEquity);
    console.log('Total Liabilities + Equity:', totalLiabilities + totalEquity);
    console.log('Balanced:', Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01);

    res.json({
      assets,
      totalAssets: Math.round(totalAssets * 100) / 100,
      liabilities,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      equity,
      netIncome: Math.round(netIncome * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabilitiesAndEquity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  } catch (err) {
    console.error("Get balance sheet error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
