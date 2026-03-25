const mongoose = require('mongoose');
require('dotenv').config();

const Account = require('./src/models/Account');

async function fixAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting');
    console.log('Connected to MongoDB');

    // Fix Revenue account - should have CREDIT normal balance
    const revenueAccount = await Account.findOne({ code: '2008' });
    if (revenueAccount) {
      console.log('\n=== FIXING REVENUE ACCOUNT ===');
      console.log('Before:', revenueAccount.name, '- Normal Balance:', revenueAccount.normalBalance);
      
      revenueAccount.normalBalance = 'credit';
      await revenueAccount.save();
      
      console.log('After:', revenueAccount.name, '- Normal Balance:', revenueAccount.normalBalance);
      console.log('✅ Revenue account fixed!');
    }

    // Check all accounts
    const accounts = await Account.find();
    console.log('\n=== ALL ACCOUNTS ===');
    accounts.forEach(acc => {
      const correctBalance = 
        (acc.type === 'asset' || acc.type === 'expense') ? 'debit' :
        (acc.type === 'liability' || acc.type === 'equity' || acc.type === 'revenue') ? 'credit' : 'unknown';
      
      const isCorrect = acc.normalBalance === correctBalance;
      const status = isCorrect ? '✅' : '❌';
      
      console.log(`${status} ${acc.code} | ${acc.name} | Type: ${acc.type} | Normal Balance: ${acc.normalBalance} (should be: ${correctBalance})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done! Connection closed');
    console.log('\n📝 IMPORTANT: You still need to create proper journal entries!');
    console.log('   Revenue entries should have:');
    console.log('   - Debit: Cash or Accounts Receivable');
    console.log('   - Credit: Revenue Account');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixAccounts();
