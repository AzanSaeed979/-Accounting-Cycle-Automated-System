require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');
const JournalEntry = require('./src/models/JournalEntry');

async function deleteInvalidEntries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    console.log('=== FINDING AND DELETING INVALID ENTRIES ===');
    const allEntries = await JournalEntry.find({}).populate('lines.account');
    
    const invalidEntryIds = [];
    
    for (const entry of allEntries) {
      const accountsUsed = {};
      let isInvalid = false;
      
      for (const line of entry.lines) {
        const accountId = line.account._id.toString();
        if (!accountsUsed[accountId]) {
          accountsUsed[accountId] = { hasDebit: false, hasCredit: false };
        }
        if (line.debit > 0) accountsUsed[accountId].hasDebit = true;
        if (line.credit > 0) accountsUsed[accountId].hasCredit = true;
        
        if (accountsUsed[accountId].hasDebit && accountsUsed[accountId].hasCredit) {
          isInvalid = true;
        }
      }
      
      if (isInvalid) {
        invalidEntryIds.push(entry._id);
        console.log(`❌ Deleting: ${entry.description} (${entry.date.toISOString().split('T')[0]})`);
        entry.lines.forEach(line => {
          console.log(`   ${line.account.name} | Debit: ${line.debit || 0} | Credit: ${line.credit || 0}`);
        });
      }
    }

    if (invalidEntryIds.length > 0) {
      const result = await JournalEntry.deleteMany({ _id: { $in: invalidEntryIds } });
      console.log(`\n✅ Deleted ${result.deletedCount} invalid journal entries`);
    } else {
      console.log('\n✅ No invalid entries found');
    }

    // Verify remaining entries
    console.log('\n=== REMAINING VALID ENTRIES ===');
    const validEntries = await JournalEntry.find({}).populate('lines.account').sort({ date: -1 });
    console.log(`Total valid entries: ${validEntries.length}\n`);
    
    validEntries.forEach(entry => {
      console.log(`${entry.date.toISOString().split('T')[0]} | ${entry.description}`);
      entry.lines.forEach(line => {
        console.log(`  ${line.account.name} | Debit: ${line.debit || 0} | Credit: ${line.credit || 0}`);
      });
      console.log('');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteInvalidEntries();
