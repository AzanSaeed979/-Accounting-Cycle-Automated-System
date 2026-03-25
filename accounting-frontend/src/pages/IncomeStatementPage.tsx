import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, DatePicker, Table, Space, Spin, message, Divider } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api/client';

const { RangePicker } = DatePicker;

interface Company {
  _id: string;
  name: string;
}

interface IncomeStatementItem {
  accountCode: string;
  accountName: string;
  category: string;
  amount: number;
}

interface IncomeStatementData {
  revenues: IncomeStatementItem[];
  totalRevenue: number;
  expenses: IncomeStatementItem[];
  totalExpenses: number;
  netIncome: number;
}

export default function IncomeStatementPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingIS, setLoadingIS] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year')
  ]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchIncomeStatement();
    }
  }, [selectedCompanyId, dateRange]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/api/companies');
      setCompanies(res.data);
      if (res.data.length > 0) {
        setSelectedCompanyId('all');
      }
      setLoading(false);
    } catch (err: any) {
      message.error('Failed to fetch companies');
      setLoading(false);
    }
  };

  const fetchIncomeStatement = async () => {
    if (!selectedCompanyId) return;

    setLoadingIS(true);
    try {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      if (selectedCompanyId !== 'all') {
        params.companyId = selectedCompanyId;
      }

      const res = await api.get('/api/accounting-cycle/income-statement', { params });
      setIncomeStatement(res.data);
      setLoadingIS(false);
    } catch (err: any) {
      console.error('Income statement error:', err);
      message.error('Failed to fetch income statement');
      setLoadingIS(false);
    }
  };

  const exportToPDF = () => {
    if (!incomeStatement) {
      message.warning('No data to export');
      return;
    }

    const company = companies.find(c => c._id === selectedCompanyId);
    const companyName = selectedCompanyId === 'all' ? 'All Companies' : (company?.name || 'Company Name');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income Statement</title>
        <style>
          @media print { @page { margin: 0.5in; } button { display: none; } }
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 15px; }
          .company-name { font-size: 26px; font-weight: bold; }
          .report-title { font-size: 20px; font-weight: bold; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #333; color: white; padding: 12px; text-align: left; border: 1px solid #000; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          .section-header { background: #e3f2fd !important; font-weight: bold; }
          .total-row { background: #d4edda !important; font-weight: bold; border-top: 3px solid #000; }
          .net-income { background: #fff3cd !important; font-weight: bold; font-size: 16px; border-top: 3px double #000; }
          .print-button { margin: 20px 0; padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="report-title">INCOME STATEMENT</div>
          <div>For the Period: ${dateRange[0].format('MMM DD, YYYY')} to ${dateRange[1].format('MMM DD, YYYY')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 70%">Account</th>
              <th style="width: 30%" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-header">
              <td colspan="2"><strong>REVENUES</strong></td>
            </tr>
            ${incomeStatement.revenues.map(item => `
              <tr>
                <td>&nbsp;&nbsp;&nbsp;${item.accountName}</td>
                <td class="text-right">${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            ${incomeStatement.revenues.length === 0 ? '<tr><td colspan="2" style="text-align:center;color:#999;">No revenue accounts</td></tr>' : ''}
            <tr class="total-row">
              <td><strong>Total Revenue</strong></td>
              <td class="text-right"><strong>${incomeStatement.totalRevenue.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="section-header">
              <td colspan="2"><strong>EXPENSES</strong></td>
            </tr>
            ${incomeStatement.expenses.map(item => `
              <tr>
                <td>&nbsp;&nbsp;&nbsp;${item.accountName}</td>
                <td class="text-right">${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            ${incomeStatement.expenses.length === 0 ? '<tr><td colspan="2" style="text-align:center;color:#999;">No expense accounts</td></tr>' : ''}
            <tr class="total-row">
              <td><strong>Total Expenses</strong></td>
              <td class="text-right"><strong>${incomeStatement.totalExpenses.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="net-income">
              <td><strong>NET INCOME</strong></td>
              <td class="text-right"><strong>${incomeStatement.netIncome.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 40px; font-size: 12px; color: #666; text-align: center;">
          Generated on ${dayjs().format('MMMM DD, YYYY [at] HH:mm:ss')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', padding: '24px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            📈 Income Statement
          </h1>
          <span style={{ color: '#666' }}>Revenue and Expenses Summary</span>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px', borderRadius: '8px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={10}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Company"
              value={selectedCompanyId || undefined}
              onChange={setSelectedCompanyId}
              options={[
                { label: '🌐 All Companies', value: 'all' },
                ...companies.map(c => ({ label: c.name, value: c._id }))
              ]}
              showSearch
            />
          </Col>
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchIncomeStatement}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={exportToPDF}
                disabled={!incomeStatement}
              >
                PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {incomeStatement && (
        <>
          <Card style={{ marginBottom: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Revenue</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  ${incomeStatement.totalRevenue.toFixed(2)}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Expenses</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  ${incomeStatement.totalExpenses.toFixed(2)}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: '12px', color: '#666' }}>Net Income</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: incomeStatement.netIncome >= 0 ? '#0066cc' : '#dc3545' }}>
                  ${incomeStatement.netIncome.toFixed(2)}
                </div>
              </Col>
            </Row>
          </Card>

          <Card style={{ borderRadius: '8px' }}>
            <Spin spinning={loadingIS}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#0066cc', marginBottom: '16px' }}>REVENUES</h3>
                <Table
                  columns={[
                    { title: 'Account', dataIndex: 'accountName', key: 'accountName', width: '70%' },
                    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: '30%', align: 'right', render: (val: number) => `$${val.toFixed(2)}` }
                  ]}
                  dataSource={incomeStatement.revenues}
                  rowKey={(record) => record.accountCode}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No revenue accounts found' }}
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                        <Table.Summary.Cell index={0}>Total Revenue</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">${incomeStatement.totalRevenue.toFixed(2)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </div>

              <Divider />

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#dc3545', marginBottom: '16px' }}>EXPENSES</h3>
                <Table
                  columns={[
                    { title: 'Account', dataIndex: 'accountName', key: 'accountName', width: '70%' },
                    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: '30%', align: 'right', render: (val: number) => `$${val.toFixed(2)}` }
                  ]}
                  dataSource={incomeStatement.expenses}
                  rowKey={(record) => record.accountCode}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No expense accounts found' }}
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                        <Table.Summary.Cell index={0}>Total Expenses</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">${incomeStatement.totalExpenses.toFixed(2)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </div>

              <Card style={{ background: '#fff3cd', borderRadius: '8px' }}>
                <Row>
                  <Col span={12}>
                    <h2 style={{ margin: 0 }}>NET INCOME</h2>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: incomeStatement.netIncome >= 0 ? '#28a745' : '#dc3545' }}>
                      ${incomeStatement.netIncome.toFixed(2)}
                    </h2>
                  </Col>
                </Row>
              </Card>
            </Spin>
          </Card>
        </>
      )}
    </div>
  );
}
