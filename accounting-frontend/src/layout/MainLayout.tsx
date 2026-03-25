import { Layout, Menu } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  FileTextOutlined,
  PieChartOutlined,
  SwapRightOutlined,
  UserOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const selectedKey =
    location.pathname === '/' ? '/dashboard' : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div
          style={{
            height: 64,
            margin: 16,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          Azan Accounting
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: '/dashboard',
              icon: <PieChartOutlined />,
              label: <Link to="/dashboard">Dashboard</Link>,
            },
            {
              key: '/companies',
              icon: <BankOutlined />,
              label: <Link to="/companies">Companies</Link>,
            },
            {
              key: '/accounts',
              icon: <BookOutlined />,
              label: <Link to="/accounts">Chart of Accounts</Link>,
            },
            {
              key: '/journal-entries',
              icon: <SwapRightOutlined />,
              label: <Link to="/journal-entries">Journal Entries</Link>,
            },
            {
              key: '/ledger',
              icon: <BookOutlined />,
              label: <Link to="/ledger">Ledger</Link>,
            },
            {
              key: '/trial-balance',
              icon: <FileTextOutlined />,
              label: <Link to="/trial-balance">Trial Balance</Link>,
            },
            {
              key: 'reports',
              icon: <FileTextOutlined />,
              label: 'Reports',
              children: [
                {
                  key: '/income-statement',
                  label: <Link to="/income-statement">Income Statement</Link>,
                },
                {
                  key: '/balance-sheet',
                  label: <Link to="/balance-sheet">Balance Sheet</Link>,
                },
                {
                  key: '/financial-statements',
                  label: <Link to="/financial-statements">All Statements</Link>,
                },
              ],
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
          }}
        >
          <div style={{ fontWeight: 600 }}>Software House Accounting</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <UserOutlined />
            <span>{user?.name}</span>
            <a onClick={logout}>Logout</a>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 8,
              minHeight: 360,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
