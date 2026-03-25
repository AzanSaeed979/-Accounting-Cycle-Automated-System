const mongoose = require('mongoose');
require('dotenv').config();

const JournalEntry = require('./src/models/JournalEntry');
const Account = require('./src/models/Account');

async function checkEntries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting');
    console.log('Connected to MongoDB');

    const entries = await JournalEntry.find().populate('lines.account');
    
    console.log('\n=== JOURNAL ENTRIES ANALYSIS ===');
    console.log('Total Entries:', entries.length);

    entries.forEach((entry, index) => {
      console.log(`\n--- Entry ${index + 1} ---`);
      console.log('Date:', entry.date.toISOString().split('T')[0]);
      console.log('Description:', entry.description);
      console.log('Type:', entry.type);
      
      let totalDebit = 0;
      let totalCredit = 0;
      
      console.log('Lines:');
      entry.lines.forEach(line => {
        const accountName = line.account ? line.account.name : 'Unknown';
        const accountType = line.account ? line.account.type : 'Unknown';
        console.log(`  - ${accountName} (${accountType})`);
        console.log(`    Debit: ${line.debit}, Credit: ${line.credit}`);
        
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
      });
      
      console.log(`Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);
      
      const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
      console.log(`Status: ${balanced ? '✅ Balanced' : '❌ Unbalanced'}`);
      
      // Check if it's a valid transaction
      const hasDifferentAccounts = entry.lines.length >= 2;
      const hasProperAmounts = totalDebit > 0 && totalCredit > 0;
      
      if (!hasDifferentAccounts) {
        console.log('⚠️  WARNING: Entry has less than 2 lines!');
      }
      if (!hasProperAmounts) {
        console.log('⚠️  WARNING: Entry has zero debits or credits!');
      }
      
      // Check if same account is used on both sides
      const accountIds = entry.lines.map(l => l.account ? l.account._id.toString() : '');
      const uniqueAccounts = [...new Set(accountIds)];
      if (accountIds.length > uniqueAccounts.length) {
        console.log('❌ ERROR: Same account used on both debit and credit side!');
        console.log('   This cancels out and shows nothing in reports!');
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkEntries();
