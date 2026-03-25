const express = require('express');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

async function buildTrialBalance({ upToDate, includeAdjusting = true }) {
  const match = {};
  if (upToDate) {
    match.date = { $lte: new Date(upToDate) };
  }
  if (!includeAdjusting) {
    match.type = { $ne: 'adjusting' };
  }

  const entries = await JournalEntry.find(match).populate('lines.account');

  const balances = new Map();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const acc = line.account;
      if (!acc) continue;
      const key = String(acc._id);
      if (!balances.has(key)) {
        balances.set(key, {
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit: 0,
          credit: 0,
        });
      }
      const row = balances.get(key);
      row.debit += line.debit || 0;
      row.credit += line.credit || 0;
    }
  }

  return Array.from(balances.values()).sort((a, b) => a.code.localeCompare(b.code));
}

router.get('/trial-balance', async (req, res) => {
  try {
    const { upToDate, includeAdjusting } = req.query;
    const rows = await buildTrialBalance({
      upToDate,
      includeAdjusting: includeAdjusting !== 'false',
    });

    const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);

    res.json({ rows, totalDebit, totalCredit });
  } catch (err) {
    console.error('Trial balance error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/income-statement', async (req, res) => {
  try {
    const { upToDate } = req.query;
    const tb = await buildTrialBalance({ upToDate, includeAdjusting: true });

    let revenue = 0;
    let expenses = 0;

    for (const row of tb) {
      const balance = row.debit - row.credit;
      if (row.type === 'revenue') {
        revenue += -balance;
      } else if (row.type === 'expense') {
        expenses += balance;
      }
    }

    const netIncome = revenue - expenses;

    res.json({
      revenue,
      expenses,
      netIncome,
    });
  } catch (err) {
    console.error('Income statement error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/balance-sheet', async (req, res) => {
  try {
    const { upToDate } = req.query;
    const tb = await buildTrialBalance({ upToDate, includeAdjusting: true });

    let assets = 0;
    let liabilities = 0;
    let equity = 0;

    for (const row of tb) {
      const balance = row.debit - row.credit;
      if (row.type === 'asset') {
        assets += balance;
      } else if (row.type === 'liability') {
        liabilities += -balance;
      } else if (row.type === 'equity') {
        equity += -balance;
      }
    }

    res.json({
      assets,
      liabilities,
      equity,
    });
  } catch (err) {
    console.error('Balance sheet error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
