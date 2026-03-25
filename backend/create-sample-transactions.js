const mongoose = require('mongoose');
require('dotenv').config();

const JournalEntry = require('./src/models/JournalEntry');
const Account = require('./src/models/Account');
const Company = require('./src/models/Company');
const User = require('./src/models/User');

async function createSampleTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting');
    console.log('Connected to MongoDB');

    // Get first company and user
    const company = await Company.findOne();
    const user = await User.findOne();
    
    if (!company) {
      console.log('❌ No company found! Please create a company first.');
      process.exit(1);
    }
    
    if (!user) {
      console.log('❌ No user found! Please register a user first.');
      process.exit(1);
    }

    console.log('Using Company:', company.name);
    console.log('Using User:', user.name);

    // Get accounts
    const cashAccount = await Account.findOne({ code: '2006' }); // Cash A/C
    const saleAccount = await Account.findOne({ code: '2008' }); // Sale A/C
    const expenseAccount = await Account.findOne({ code: '2009' }); // Hussnian Saeed (expense)

    if (!cashAccount || !saleAccount || !expenseAccount) {
      console.log('❌ Required accounts not found!');
      console.log('Cash Account:', cashAccount ? '✅' : '❌');
      console.log('Sale Account:', saleAccount ? '✅' : '❌');
      console.log('Expense Account:', expenseAccount ? '✅' : '❌');
      process.exit(1);
    }

    console.log('\n=== CREATING SAMPLE TRANSACTIONS ===\n');

    // Transaction 1: Cash Sale (Generate Revenue)
    console.log('Creating Transaction 1: Cash Sale...');
    const sale1 = await JournalEntry.create({
      company: company._id,
      date: new Date('2024-01-15'),
      referenceNumber: 'JE-001',
      description: 'Cash sale of services to customer',
      type: 'normal',
      lines: [
        {
          account: cashAccount._id,
          debit: 5000,
          credit: 0
        },
        {
          account: saleAccount._id,
          debit: 0,
          credit: 5000
        }
      ],
      createdBy: user._id
    });
    console.log('✅ Created: Cash $5,000 (Debit) / Sale Revenue $5,000 (Credit)');

    // Transaction 2: Another Cash Sale
    console.log('\nCreating Transaction 2: Another Cash Sale...');
    const sale2 = await JournalEntry.create({
      company: company._id,
      date: new Date('2024-01-20'),
      referenceNumber: 'JE-002',
      description: 'Cash sale - second transaction',
      type: 'normal',
      lines: [
        {
          account: cashAccount._id,
          debit: 3000,
          credit: 0
        },
        {
          account: saleAccount._id,
          debit: 0,
          credit: 3000
        }
      ],
      createdBy: user._id
    });
    console.log('✅ Created: Cash $3,000 (Debit) / Sale Revenue $3,000 (Credit)');

    // Transaction 3: Pay Expense
    console.log('\nCreating Transaction 3: Pay Expense...');
    const expense1 = await JournalEntry.create({
      company: company._id,
      date: new Date('2024-01-25'),
      referenceNumber: 'JE-003',
      description: 'Payment for expenses',
      type: 'normal',
      lines: [
        {
          account: expenseAccount._id,
          debit: 2000,
          credit: 0
        },
        {
          account: cashAccount._id,
          debit: 0,
          credit: 2000
        }
      ],
      createdBy: user._id
    });
    console.log('✅ Created: Expense $2,000 (Debit) / Cash $2,000 (Credit)');

    console.log('\n=== SUMMARY ===');
    console.log('✅ Created 3 proper journal entries');
    console.log('\nExpected Results:');
    console.log('- Income Statement:');
    console.log('  Revenue: $8,000 ($5,000 + $3,000)');
    console.log('  Expenses: $2,000');
    console.log('  Net Income: $6,000');
    console.log('\n- Balance Sheet:');
    console.log('  Cash: $6,000 ($5,000 + $3,000 - $2,000)');

    console.log('\n📝 IMPORTANT: Delete or fix your old entries!');
    console.log('   The old entries have same account on both sides and cancel out.');

    await mongoose.connection.close();
    console.log('\n✅ Done! Connection closed');
    console.log('\nNow refresh your Income Statement and Balance Sheet pages!');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createSampleTransactions();
