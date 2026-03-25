const mongoose = require('mongoose');
require('dotenv').config();

const JournalEntry = require('./src/models/JournalEntry');
const Account = require('./src/models/Account');
const Company = require('./src/models/Company');

async function diagnoseAndFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting');
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Check Companies
    console.log('=== STEP 1: CHECKING COMPANIES ===');
    const companies = await Company.find();
    console.log(`Found ${companies.length} companies`);
    
    if (companies.length === 0) {
      console.log('❌ No companies found! You need to create a company first.');
      await mongoose.connection.close();
      return;
    }
    
    const company = companies[0];
    console.log(`Using company: ${company.name} (ID: ${company._id})\n`);

    // Step 2: Check Accounts
    console.log('=== STEP 2: CHECKING ACCOUNTS ===');
    const accounts = await Account.find({ isActive: true });
    console.log(`Found ${accounts.length} active accounts`);
    
    const revenueAccounts = accounts.filter(a => a.type === 'revenue');
    const expenseAccounts = accounts.filter(a => a.type === 'expense');
    const assetAccounts = accounts.filter(a => a.type === 'asset');
    
    console.log(`  - Revenue accounts: ${revenueAccounts.length}`);
    console.log(`  - Expense accounts: ${expenseAccounts.length}`);
    console.log(`  - Asset accounts: ${assetAccounts.length}`);
    
    // Check for wrong normal balances
    console.log('\nChecking account normal balances...');
    let fixedAccounts = 0;
    
    for (const account of revenueAccounts) {
      if (account.normalBalance !== 'credit') {
        console.log(`  ⚠️  ${account.name} (${account.code}) - Revenue account has DEBIT normal balance`);
        console.log(`     Fixing to CREDIT...`);
        account.normalBalance = 'credit';
        await account.save();
        fixedAccounts++;
      }
    }
    
    for (const account of expenseAccounts) {
      if (account.normalBalance !== 'debit') {
        console.log(`  ⚠️  ${account.name} (${account.code}) - Expense account has CREDIT normal balance`);
        console.log(`     Fixing to DEBIT...`);
        account.normalBalance = 'debit';
        await account.save();
        fixedAccounts++;
      }
    }
    
    if (fixedAccounts > 0) {
      console.log(`✅ Fixed ${fixedAccounts} accounts\n`);
    } else {
      console.log(`✅ All accounts have correct normal balances\n`);
    }

    // Step 3: Check Journal Entries
    console.log('=== STEP 3: CHECKING JOURNAL ENTRIES ===');
    const entries = await JournalEntry.find().populate('lines.account company');
    console.log(`Found ${entries.length} journal entries\n`);

    const problemEntries = [];
    const goodEntries = [];

    entries.forEach((entry, index) => {
      console.log(`--- Entry ${index + 1} ---`);
      console.log(`Date: ${entry.date.toISOString().split('T')[0]}`);
      console.log(`Company: ${entry.company ? entry.company.name : 'Unknown'}`);
      console.log(`Description: ${entry.description}`);
      console.log(`Reference: ${entry.referenceNumber || 'N/A'}`);
      
      let totalDebit = 0;
      let totalCredit = 0;
      const accountIds = [];
      
      console.log('Lines:');
      entry.lines.forEach(line => {
        const accountName = line.account ? line.account.name : 'Unknown';
        const accountType = line.account ? line.account.type : 'Unknown';
        const accountId = line.account ? line.account._id.toString() : '';
        
        console.log(`  ${accountName} (${accountType})`);
        console.log(`    Debit: $${line.debit || 0}, Credit: $${line.credit || 0}`);
        
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
        accountIds.push(accountId);
      });
      
      console.log(`Total: Debit $${totalDebit}, Credit $${totalCredit}`);
      
      // Check for problems
      const problems = [];
      
      // Problem 1: Unbalanced
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        problems.push('Unbalanced (Debits ≠ Credits)');
      }
      
      // Problem 2: Same account on both sides
      const uniqueAccounts = [...new Set(accountIds)];
      if (accountIds.length > uniqueAccounts.length) {
        problems.push('Same account used on both debit and credit');
      }
      
      // Problem 3: Zero amounts
      if (totalDebit === 0 || totalCredit === 0) {
        problems.push('Zero debits or credits');
      }
      
      // Problem 4: Same debit and credit on same account
      const accountTotals = {};
      entry.lines.forEach(line => {
        const accountId = line.account ? line.account._id.toString() : '';
        if (!accountTotals[accountId]) {
          accountTotals[accountId] = { debit: 0, credit: 0, name: line.account ? line.account.name : 'Unknown' };
        }
        accountTotals[accountId].debit += line.debit || 0;
        accountTotals[accountId].credit += line.credit || 0;
      });
      
      for (const accountId in accountTotals) {
        const totals = accountTotals[accountId];
        if (totals.debit > 0 && totals.credit > 0) {
          problems.push(`${totals.name} has both debit ($${totals.debit}) and credit ($${totals.credit}) - cancels out!`);
        }
      }
      
      if (problems.length > 0) {
        console.log('❌ PROBLEMS:');
        problems.forEach(p => console.log(`   - ${p}`));
        problemEntries.push({ entry, problems });
      } else {
        console.log('✅ Entry is correct');
        goodEntries.push(entry);
      }
      
      console.log('');
    });

    // Step 4: Summary and Recommendations
    console.log('=== STEP 4: SUMMARY ===');
    console.log(`Total Entries: ${entries.length}`);
    console.log(`Good Entries: ${goodEntries.length}`);
    console.log(`Problem Entries: ${problemEntries.length}\n`);

    if (problemEntries.length > 0) {
      console.log('❌ PROBLEM ENTRIES FOUND!');
      console.log('These entries are causing your reports to show $0.00:\n');
      
      problemEntries.forEach((item, index) => {
        console.log(`${index + 1}. ${item.entry.description}`);
        console.log(`   Date: ${item.entry.date.toISOString().split('T')[0]}`);
        console.log(`   Problems:`);
        item.problems.forEach(p => console.log(`     - ${p}`));
        console.log('');
      });
      
      console.log('RECOMMENDATION:');
      console.log('Delete these problem entries and create correct ones.\n');
    }

    if (goodEntries.length === 0) {
      console.log('⚠️  NO GOOD ENTRIES FOUND!');
      console.log('This is why your Income Statement shows $0.00\n');
      
      console.log('CREATING SAMPLE TRANSACTIONS...\n');
      
      // Find accounts
      const cashAccount = assetAccounts.find(a => a.name.toLowerCase().includes('cash'));
      const revenueAccount = revenueAccounts[0];
      const expenseAccount = expenseAccounts[0];
      
      if (!cashAccount || !revenueAccount || !expenseAccount) {
        console.log('❌ Cannot create sample transactions - missing required accounts');
        console.log(`   Cash Account: ${cashAccount ? '✅' : '❌'}`);
        console.log(`   Revenue Account: ${revenueAccount ? '✅' : '❌'}`);
        console.log(`   Expense Account: ${expenseAccount ? '✅' : '❌'}`);
      } else {
        // Create sample transactions
        const sampleEntries = [
          {
            company: company._id,
            date: new Date('2024-01-15'),
            type: 'normal',
            referenceNumber: 'JE-001',
            description: 'Cash sale of services to customer',
            lines: [
              { account: cashAccount._id, debit: 5000, credit: 0, description: 'Cash received' },
              { account: revenueAccount._id, debit: 0, credit: 5000, description: 'Service revenue' }
            ]
          },
          {
            company: company._id,
            date: new Date('2024-01-20'),
            type: 'normal',
            referenceNumber: 'JE-002',
            description: 'Cash sale - second transaction',
            lines: [
              { account: cashAccount._id, debit: 3000, credit: 0, description: 'Cash received' },
              { account: revenueAccount._id, debit: 0, credit: 3000, description: 'Service revenue' }
            ]
          },
          {
            company: company._id,
            date: new Date('2024-01-25'),
            type: 'normal',
            referenceNumber: 'JE-003',
            description: 'Payment for expenses',
            lines: [
              { account: expenseAccount._id, debit: 2000, credit: 0, description: 'Expense payment' },
              { account: cashAccount._id, debit: 0, credit: 2000, description: 'Cash paid' }
            ]
          }
        ];
        
        for (const entryData of sampleEntries) {
          const newEntry = new JournalEntry(entryData);
          await newEntry.save();
          console.log(`✅ Created: ${entryData.description}`);
        }
        
        console.log('\n✅ Sample transactions created successfully!');
        console.log('\nEXPECTED RESULTS:');
        console.log('  Revenue: $8,000 (5,000 + 3,000)');
        console.log('  Expenses: $2,000');
        console.log('  Net Income: $6,000');
        console.log('  Cash Balance: $6,000 (5,000 + 3,000 - 2,000)\n');
      }
    } else {
      console.log('✅ You have good entries!');
      console.log('If reports still show $0.00, check:');
      console.log('  1. Date range includes these entries');
      console.log('  2. Company filter is correct');
      console.log('  3. Browser cache (try hard refresh: Ctrl+Shift+R)\n');
    }

    // Step 5: Calculate what SHOULD show
    console.log('=== STEP 5: CALCULATING EXPECTED RESULTS ===');
    
    const allEntries = await JournalEntry.find().populate('lines.account');
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    for (const account of accounts) {
      if (account.type !== 'revenue' && account.type !== 'expense') continue;
      
      let balance = 0;
      
      allEntries.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.account && line.account._id.toString() === account._id.toString()) {
            if (account.normalBalance === 'credit') {
              balance += (line.credit || 0) - (line.debit || 0);
            } else {
              balance += (line.debit || 0) - (line.credit || 0);
            }
          }
        });
      });
      
      if (balance !== 0) {
        if (account.type === 'revenue') {
          console.log(`Revenue - ${account.name}: $${Math.abs(balance).toFixed(2)}`);
          totalRevenue += Math.abs(balance);
        } else {
          console.log(`Expense - ${account.name}: $${Math.abs(balance).toFixed(2)}`);
          totalExpenses += Math.abs(balance);
        }
      }
    }
    
    console.log(`\nTotal Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`Net Income: $${(totalRevenue - totalExpenses).toFixed(2)}\n`);
    
    if (totalRevenue === 0 && totalExpenses === 0) {
      console.log('❌ STILL SHOWING $0.00!');
      console.log('This means all your journal entries have problems.');
      console.log('Please delete the problem entries and use the sample transactions created above.\n');
    } else {
      console.log('✅ Data looks good! Your reports should show these amounts.');
      console.log('If they don\'t, try:');
      console.log('  1. Refresh the page (Ctrl+R)');
      console.log('  2. Check date range filter');
      console.log('  3. Check company filter\n');
    }

    await mongoose.connection.close();
    console.log('✅ Diagnosis complete!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

diagnoseAndFix();
