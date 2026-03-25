const mongoose = require('mongoose');
require('dotenv').config();

const JournalEntry = require('./src/models/JournalEntry');
const Account = require('./src/models/Account');
const Company = require('./src/models/Company');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting');
    console.log('Connected to MongoDB');

    const companies = await Company.find();
    console.log('\n=== COMPANIES ===');
    console.log('Total Companies:', companies.length);
    if (companies.length > 0) {
      console.log('Sample Company:', companies[0].name, '- ID:', companies[0]._id);
    }

    const accounts = await Account.find();
    console.log('\n=== ACCOUNTS ===');
    console.log('Total Accounts:', accounts.length);
    accounts.forEach(acc => {
      console.log(`- ${acc.code} | ${acc.name} | Type: ${acc.type} | Normal Balance: ${acc.normalBalance}`);
    });

    const entries = await JournalEntry.find().populate('lines.account');
    console.log('\n=== JOURNAL ENTRIES ===');
    console.log('Total Journal Entries:', entries.length);
    
    if (entries.length > 0) {
      console.log('\nSample Entry:');
      const entry = entries[0];
      console.log('Date:', entry.date);
      console.log('Description:', entry.description);
      console.log('Lines:');
      entry.lines.forEach(line => {
        console.log(`  - ${line.account.name}: Debit ${line.debit}, Credit ${line.credit}`);
      });
    } else {
      console.log('\n⚠️  NO JOURNAL ENTRIES FOUND!');
      console.log('This is why Income Statement and Balance Sheet show $0.00');
      console.log('\nYou need to create journal entries first!');
    }

    // Check for revenue and expense accounts
    const revenueAccounts = accounts.filter(a => a.type === 'revenue');
    const expenseAccounts = accounts.filter(a => a.type === 'expense');
    
    console.log('\n=== REVENUE ACCOUNTS ===');
    console.log('Total:', revenueAccounts.length);
    revenueAccounts.forEach(acc => {
      console.log(`- ${acc.code} | ${acc.name}`);
    });

    console.log('\n=== EXPENSE ACCOUNTS ===');
    console.log('Total:', expenseAccounts.length);
    expenseAccounts.forEach(acc => {
      console.log(`- ${acc.code} | ${acc.name}`);
    });

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkData();
