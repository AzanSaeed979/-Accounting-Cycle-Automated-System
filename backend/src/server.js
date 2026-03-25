require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const companiesRoutes = require("./routes/companies");
const accountRoutes = require("./routes/accounts");
const journalEntryRoutes = require("./routes/journalEntries");
const ledgerRoutes = require("./routes/ledger");
const trialBalanceRoutes = require("./routes/trialBalance");
const financialStatementRoutes = require("./routes/financialStatements");
const reportRoutes = require("./routes/reports");
const accountingCycleRoutes = require("./routes/accountingCycle");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/journal-entries", journalEntryRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/trial-balance", trialBalanceRoutes);
app.use("/api/financial-statements", financialStatementRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/accounting-cycle", accountingCycleRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
