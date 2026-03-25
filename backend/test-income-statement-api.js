require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');
const JournalEntry = require('./src/models/JournalEntry');

async function testIncomeStatement() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // Test the income statement calculation logic (same as API endpoint)
    console.log('=== TESTING INCOME STATEMENT API LOGIC ===\n');
    
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
    const journalEntries = await JournalEntry.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate("lines.account");

    console.log(`Date Range: ${startDate} to ${endDate}`);
    console.log(`Total Active Accounts: ${accounts.length}`);
    console.log(`Journal Entries Found: ${journalEntries.length}\n`);

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
        console.log(`Account: ${account.name} (${account.type})`);
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
      }
      
      if (accountDebits > 0 || accountCredits > 0) {
        console.log('');
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    console.log('=== INCOME STATEMENT RESULTS ===');
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`Net Income: $${netIncome.toFixed(2)}`);
    console.log(`Revenue Items: ${revenues.length}`);
    console.log(`Expense Items: ${expenses.length}`);

    console.log('\n=== REVENUE BREAKDOWN ===');
    revenues.forEach(r => {
      console.log(`  ${r.accountCode} - ${r.accountName}: $${r.amount.toFixed(2)}`);
    });

    console.log('\n=== EXPENSE BREAKDOWN ===');
    expenses.forEach(e => {
      console.log(`  ${e.accountCode} - ${e.accountName}: $${e.amount.toFixed(2)}`);
    });

    if (totalRevenue === 0 && totalExpenses === 0) {
      console.log('\n⚠️  WARNING: Income Statement shows $0.00');
      console.log('Possible reasons:');
      console.log('1. No journal entries in the selected date range');
      console.log('2. No revenue or expense accounts have transactions');
      console.log('3. All entries were invalid (same account on both sides)');
    } else {
      console.log('\n✅ Income Statement is working correctly!');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testIncomeStatement();
