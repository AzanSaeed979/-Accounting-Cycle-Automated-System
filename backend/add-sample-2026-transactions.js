require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');
const JournalEntry = require('./src/models/JournalEntry');
const Company = require('./src/models/Company');

async function addSampleTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');

    // Get accounts
    const cashAccount = await Account.findOne({ name: 'Cash A/C' });
    const saleAccount = await Account.findOne({ name: 'Sale A/C' });
    const expenseAccount = await Account.findOne({ name: 'Expense A/C' });
    const rentAccount = await Account.findOne({ name: 'Rent A/C' });
    const hussnianAccount = await Account.findOne({ name: 'Hussnian Saeed' });

    // Get first company
    const company = await Company.findOne();
    const User = require('./src/models/User');
    const user = await User.findOne();

    if (!company) {
      console.log('❌ No company found. Please create a company first.');
      await mongoose.connection.close();
      return;
    }

    if (!user) {
      console.log('❌ No user found. Please create a user first.');
      await mongoose.connection.close();
      return;
    }

    console.log(`Using company: ${company.name}`);
    console.log(`Using user: ${user.name}\n`);

    // Sample transactions for 2026
    const transactions = [
      {
        date: new Date('2026-02-01'),
        referenceNumber: 'JE-2026-001',
        description: 'Cash sale of services',
        lines: [
          { account: cashAccount._id, debit: 5000, credit: 0 },
          { account: saleAccount._id, debit: 0, credit: 5000 }
        ]
      },
      {
        date: new Date('2026-02-02'),
        referenceNumber: 'JE-2026-002',
        description: 'Cash sale of products',
        lines: [
          { account: cashAccount._id, debit: 3500, credit: 0 },
          { account: saleAccount._id, debit: 0, credit: 3500 }
        ]
      },
      {
        date: new Date('2026-02-03'),
        referenceNumber: 'JE-2026-003',
        description: 'Paid office rent for February',
        lines: [
          { account: rentAccount._id, debit: 1500, credit: 0 },
          { account: cashAccount._id, debit: 0, credit: 1500 }
        ]
      },
      {
        date: new Date('2026-02-03'),
        referenceNumber: 'JE-2026-004',
        description: 'Office supplies expense',
        lines: [
          { account: expenseAccount._id, debit: 800, credit: 0 },
          { account: cashAccount._id, debit: 0, credit: 800 }
        ]
      },
      {
        date: new Date('2026-01-15'),
        referenceNumber: 'JE-2026-005',
        description: 'January sales revenue',
        lines: [
          { account: cashAccount._id, debit: 7500, credit: 0 },
          { account: saleAccount._id, debit: 0, credit: 7500 }
        ]
      },
      {
        date: new Date('2026-01-20'),
        referenceNumber: 'JE-2026-006',
        description: 'Consulting services expense',
        lines: [
          { account: hussnianAccount._id, debit: 2500, credit: 0 },
          { account: cashAccount._id, debit: 0, credit: 2500 }
        ]
      }
    ];

    console.log('=== CREATING SAMPLE TRANSACTIONS FOR 2026 ===\n');

    for (const txn of transactions) {
      const entry = await JournalEntry.create({
        company: company._id,
        date: txn.date,
        referenceNumber: txn.referenceNumber,
        description: txn.description,
        type: 'normal',
        lines: txn.lines,
        createdBy: user._id
      });

      console.log(`✅ Created: ${txn.description} (${txn.date.toISOString().split('T')[0]})`);
      txn.lines.forEach(line => {
        const account = [cashAccount, saleAccount, expenseAccount, rentAccount, hussnianAccount]
          .find(a => a._id.toString() === line.account.toString());
        console.log(`   ${account.name} | Debit: $${line.debit} | Credit: $${line.credit}`);
      });
      console.log('');
    }

    console.log('=== VERIFYING INCOME STATEMENT FOR 2026 ===\n');

    const accounts = await Account.find({ isActive: true, type: { $in: ['revenue', 'expense'] } });
    const entries2026 = await JournalEntry.find({
      date: { $gte: new Date('2026-01-01'), $lte: new Date('2026-12-31') }
    }).populate('lines.account');

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accounts) {
      let balance = 0;
      
      entries2026.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.account._id.toString() === account._id.toString()) {
            if (account.normalBalance === 'credit') {
              balance += (line.credit || 0) - (line.debit || 0);
            } else {
              balance += (line.debit || 0) - (line.credit || 0);
            }
          }
        });
      });

      if (balance !== 0) {
        console.log(`${account.name}: $${Math.abs(balance).toFixed(2)}`);
        if (account.type === 'revenue') {
          totalRevenue += Math.abs(balance);
        } else {
          totalExpenses += Math.abs(balance);
        }
      }
    }

    console.log('\n=== 2026 INCOME STATEMENT SUMMARY ===');
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`Net Income: $${(totalRevenue - totalExpenses).toFixed(2)}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSampleTransactions();
