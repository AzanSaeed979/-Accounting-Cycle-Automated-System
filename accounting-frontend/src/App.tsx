import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ChartOfAccountsPage from './pages/ChartOfAccountsPage';
import JournalEntriesPage from './pages/JournalEntriesPage';
import TrialBalancePage from './pages/TrialBalancePage';
import FinancialStatementsPage from './pages/FinancialStatementsPage';
import CompaniesPage from './pages/CompaniesPage';
import LedgerPage from './pages/LedgerPage';
import IncomeStatementPage from './pages/IncomeStatementPage';
import BalanceSheetPage from './pages/BalanceSheetPage';

// Theme configuration for Ant Design
const themeConfig = {
  token: {
    colorPrimary: '#0066cc',
    colorSuccess: '#28a745',
    colorWarning: '#ffc107',
    colorError: '#dc3545',
    colorInfo: '#17a2b8',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/accounts" element={<ChartOfAccountsPage />} />
        <Route path="/journal-entries" element={<JournalEntriesPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/trial-balance" element={<TrialBalancePage />} />
        <Route path="/financial-statements" element={<FinancialStatementsPage />} />
        <Route path="/income-statement" element={<IncomeStatementPage />} />
        <Route path="/balance-sheet" element={<BalanceSheetPage />} />
      </Route>
    </Routes>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;