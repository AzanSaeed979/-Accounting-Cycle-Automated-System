require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');
const JournalEntry = require('./src/models/JournalEntry');

async function checkIncomeStatement() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // Check revenue and expense accounts
    console.log('=== REVENUE & EXPENSE ACCOUNTS ===');
    const accounts = await Account.find({
      type: { $in: ['revenue', 'expense'] },
      isActive: true
    }).sort({ code: 1 });
    
    console.log(`Total accounts found: ${accounts.length}\n`);
    accounts.forEach(a => {
      console.log(`${a.code} | ${a.name}`);
      console.log(`  Type: ${a.type} | Normal Balance: ${a.normalBalance}`);
      console.log(`  Category: ${a.category}`);
      console.log('');
    });

    // Check journal entries
    console.log('\n=== JOURNAL ENTRIES ===');
    const entries = await JournalEntry.find({}).populate('lines.account').sort({ date: -1 }).limit(10);
    console.log(`Total entries found: ${entries.length}\n`);
    
    entries.forEach(entry => {
      console.log(`Date: ${entry.date.toISOString().split('T')[0]} | ${entry.description}`);
      entry.lines.forEach(line => {
        console.log(`  ${line.account.name} | Debit: ${line.debit || 0} | Credit: ${line.credit || 0}`);
      });
      console.log('');
    });

    // Calculate income statement
    console.log('\n=== INCOME STATEMENT CALCULATION ===');
    const allEntries = await JournalEntry.find({}).populate('lines.account');
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    accounts.forEach(account => {
      let balance = 0;
      let debits = 0;
      let credits = 0;
      
      allEntries.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.account._id.toString() === account._id.toString()) {
            debits += line.debit || 0;
            credits += line.credit || 0;
            
            if (account.normalBalance === 'credit') {
              balance += (line.credit || 0) - (line.debit || 0);
            } else {
              balance += (line.debit || 0) - (line.credit || 0);
            }
          }
        });
      });
      
      if (debits > 0 || credits > 0) {
        console.log(`\n${account.name} (${account.type})`);
        console.log(`  Normal Balance: ${account.normalBalance}`);
        console.log(`  Total Debits: ${debits}`);
        console.log(`  Total Credits: ${credits}`);
        console.log(`  Calculated Balance: ${balance}`);
        
        if (balance !== 0) {
          if (account.type === 'revenue') {
            totalRevenue += Math.abs(balance);
            console.log(`  ✅ Added to Revenue: ${Math.abs(balance)}`);
          } else {
            totalExpenses += Math.abs(balance);
            console.log(`  ✅ Added to Expenses: ${Math.abs(balance)}`);
          }
        } else {
          console.log(`  ⚠️  Balance is $0 - NOT included in report`);
        }
      }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Revenue: $${totalRevenue}`);
    console.log(`Total Expenses: $${totalExpenses}`);
    console.log(`Net Income: $${totalRevenue - totalExpenses}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkIncomeStatement();
