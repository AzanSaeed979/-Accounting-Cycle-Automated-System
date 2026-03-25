require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');
const JournalEntry = require('./src/models/JournalEntry');

async function fixIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // FIX 1: Correct the normal balance for revenue accounts
    console.log('=== FIXING REVENUE ACCOUNT NORMAL BALANCES ===');
    const revenueAccounts = await Account.find({ type: 'revenue' });
    
    for (const account of revenueAccounts) {
      if (account.normalBalance !== 'credit') {
        console.log(`Fixing ${account.name}: ${account.normalBalance} → credit`);
        account.normalBalance = 'credit';
        await account.save();
      } else {
        console.log(`${account.name}: Already correct (credit)`);
      }
    }

    // FIX 2: Delete invalid journal entries (same account on both sides)
    console.log('\n=== FINDING INVALID JOURNAL ENTRIES ===');
    const allEntries = await JournalEntry.find({}).populate('lines.account');
    
    const invalidEntries = [];
    for (const entry of allEntries) {
      // Check if any account appears on both debit and credit sides
      const accountsUsed = {};
      let isInvalid = false;
      
      for (const line of entry.lines) {
        const accountId = line.account._id.toString();
        if (!accountsUsed[accountId]) {
          accountsUsed[accountId] = { hasDebit: false, hasCredit: false };
        }
        if (line.debit > 0) accountsUsed[accountId].hasDebit = true;
        if (line.credit > 0) accountsUsed[accountId].hasCredit = true;
        
        // If same account has both debit and credit, it's invalid
        if (accountsUsed[accountId].hasDebit && accountsUsed[accountId].hasCredit) {
          isInvalid = true;
        }
      }
      
      if (isInvalid) {
        invalidEntries.push(entry);
        console.log(`\nInvalid Entry: ${entry.description} (${entry.date.toISOString().split('T')[0]})`);
        entry.lines.forEach(line => {
          console.log(`  ${line.account.name} | Debit: ${line.debit || 0} | Credit: ${line.credit || 0}`);
        });
      }
    }

    if (invalidEntries.length > 0) {
      console.log(`\n⚠️  Found ${invalidEntries.length} invalid entries with same account on both sides`);
      console.log('These entries will result in $0 balance and not show in reports.');
      console.log('\nDo you want to delete these invalid entries? (You need to manually confirm)');
      console.log('To delete, run: await JournalEntry.deleteMany({ _id: { $in: [ids] } })');
    } else {
      console.log('\n✅ No invalid entries found');
    }

    // FIX 3: Verify expense accounts have correct normal balance
    console.log('\n=== CHECKING EXPENSE ACCOUNT NORMAL BALANCES ===');
    const expenseAccounts = await Account.find({ type: 'expense' });
    
    for (const account of expenseAccounts) {
      if (account.normalBalance !== 'debit') {
        console.log(`Fixing ${account.name}: ${account.normalBalance} → debit`);
        account.normalBalance = 'debit';
        await account.save();
      } else {
        console.log(`${account.name}: Already correct (debit)`);
      }
    }

    console.log('\n=== FIXES COMPLETED ===');
    console.log('✅ Revenue accounts set to credit normal balance');
    console.log('✅ Expense accounts verified as debit normal balance');
    console.log(`⚠️  ${invalidEntries.length} invalid journal entries identified`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIssues();
