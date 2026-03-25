import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Empty, Spin, Alert, Tag, Divider, Button, Space } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import api from '../api/client';

interface Company {
  _id: string;
  name: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;
  contactEmail: string;
  description?: string;
}

interface DashboardStats {
  totalAccounts: number;
  totalJournalEntries: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
}

export default function DashboardPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const companiesRes = await api.get('/api/companies');
        if (companiesRes.data.length > 0) {
          setCompany(companiesRes.data[0]);

          const accountsRes = await api.get('/api/accounts');
          const journalRes = await api.get('/api/journal-entries', {
            params: { companyId: companiesRes.data[0]._id },
          });

          setStats({
            totalAccounts: accountsRes.data.length,
            totalJournalEntries: journalRes.data.length,
            totalAssets: 0,
            totalLiabilities: 0,
            totalEquity: 0,
            netIncome: 0,
          });
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', padding: '24px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
              📊 Accounting Dashboard
            </h1>
            {company && (
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {company.name}
              </Tag>
            )}
          </Space>
        </Col>
      </Row>

      {company && (
        <Card
          style={{ marginBottom: '24px', borderRadius: '8px' }}
          title={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>📋 Company Information</span>}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={8}>
              <div>
                <span style={{ color: '#666', fontSize: '12px' }}>BUSINESS TYPE</span>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {company.businessType}
                </p>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div>
                <span style={{ color: '#666', fontSize: '12px' }}>REGISTRATION NUMBER</span>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {company.registrationNumber}
                </p>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div>
                <span style={{ color: '#666', fontSize: '12px' }}>CONTACT EMAIL</span>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {company.contactEmail}
                </p>
              </div>
            </Col>
            {company.description && (
              <Col xs={24}>
                <div>
                  <span style={{ color: '#666', fontSize: '12px' }}>DESCRIPTION</span>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    {company.description}
                  </p>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {stats ? (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              💰 Key Metrics
            </h2>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
                  <Statistic
                    title="Total Accounts"
                    value={stats.totalAccounts}
                    prefix={<AccountBookOutlined style={{ color: '#0066cc' }} />}
                    valueStyle={{ color: '#0066cc', fontSize: '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
                  <Statistic
                    title="Journal Entries"
                    value={stats.totalJournalEntries}
                    prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
                  <Statistic
                    title="Total Assets"
                    value={stats.totalAssets}
                    prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                    suffix=""
                    precision={2}
                    valueStyle={{ color: '#faad14', fontSize: '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
                  <Statistic
                    title="Total Liabilities"
                    value={stats.totalLiabilities}
                    prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
                    suffix=""
                    precision={2}
                    valueStyle={{ color: '#f5222d', fontSize: '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
                  <Statistic
                    title="Total Equity"
                    value={stats.totalEquity}
                    prefix={<ArrowUpOutlined style={{ color: '#1890ff' }} />}
                    suffix=""
                    precision={2}
                    valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
                  <Statistic
                    title="Net Income"
                    value={stats.netIncome}
                    prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                    suffix=""
                    precision={2}
                    valueStyle={{ color: stats.netIncome >= 0 ? '#52c41a' : '#f5222d', fontSize: '24px' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>

          <Divider />

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              🚀 Quick Actions
            </h2>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<AccountBookOutlined />}
                  onClick={() => window.location.href = '/accounts'}
                >
                  Chart of Accounts
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="default"
                  block
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => window.location.href = '/journal-entries'}
                >
                  Journal Entries
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="default"
                  block
                  size="large"
                  icon={<FileExcelOutlined />}
                  onClick={() => window.location.href = '/trial-balance'}
                >
                  Trial Balance
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="default"
                  block
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </div>
        </>
      ) : (
        <Empty description="No statistics available" />
      )}
    </div>
  );
}
