import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, DatePicker, Tabs, Table, Space, Spin, message, Divider } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api/client';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

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

interface BalanceSheetItem {
  accountCode: string;
  accountName: string;
  category: string;
  amount: number;
}

interface BalanceSheetData {
  assets: BalanceSheetItem[];
  totalAssets: number;
  liabilities: BalanceSheetItem[];
  totalLiabilities: number;
  equity: BalanceSheetItem[];
  netIncome: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export default function FinancialStatementsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingIS, setLoadingIS] = useState(false);
  const [loadingBS, setLoadingBS] = useState(false);
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
      fetchBalanceSheet();
    }
  }, [selectedCompanyId, dateRange]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/api/companies');
      setCompanies(res.data);
      if (res.data.length > 0) {
        setSelectedCompanyId('all'); // Default to "All"
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

      // Only add companyId if not "all"
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

  const fetchBalanceSheet = async () => {
    if (!selectedCompanyId) return;

    setLoadingBS(true);
    try {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      // Only add companyId if not "all"
      if (selectedCompanyId !== 'all') {
        params.companyId = selectedCompanyId;
      }

      const res = await api.get('/api/accounting-cycle/balance-sheet', { params });
      setBalanceSheet(res.data);
      setLoadingBS(false);
    } catch (err: any) {
      console.error('Balance sheet error:', err);
      message.error('Failed to fetch balance sheet');
      setLoadingBS(false);
    }
  };

  const exportIncomeStatementToPDF = () => {
    if (!incomeStatement) {
      message.warning('No data to export');
      return;
    }

    const company = companies.find(c => c._id === selectedCompanyId);
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
          <div class="company-name">${company?.name || 'Company Name'}</div>
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
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Revenue</strong></td>
              <td class="text-right"><strong>$${incomeStatement.totalRevenue.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="section-header">
              <td colspan="2"><strong>EXPENSES</strong></td>
            </tr>
            ${incomeStatement.expenses.map(item => `
              <tr>
                <td>&nbsp;&nbsp;&nbsp;${item.accountName}</td>
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Expenses</strong></td>
              <td class="text-right"><strong>$${incomeStatement.totalExpenses.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="net-income">
              <td><strong>NET INCOME</strong></td>
              <td class="text-right"><strong>$${incomeStatement.netIncome.toFixed(2)}</strong></td>
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

  const exportBalanceSheetToPDF = () => {
    if (!balanceSheet) {
      message.warning('No data to export');
      return;
    }

    const company = companies.find(c => c._id === selectedCompanyId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Balance Sheet</title>
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
          .grand-total { background: #fff3cd !important; font-weight: bold; font-size: 16px; border-top: 3px double #000; }
          .print-button { margin: 20px 0; padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <div class="header">
          <div class="company-name">${company?.name || 'Company Name'}</div>
          <div class="report-title">BALANCE SHEET</div>
          <div>As of ${dateRange[1].format('MMMM DD, YYYY')}</div>
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
              <td colspan="2"><strong>ASSETS</strong></td>
            </tr>
            ${balanceSheet.assets.map(item => `
              <tr>
                <td>&nbsp;&nbsp;&nbsp;${item.accountName}</td>
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Assets</strong></td>
              <td class="text-right"><strong>$${balanceSheet.totalAssets.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="section-header">
              <td colspan="2"><strong>LIABILITIES</strong></td>
            </tr>
            ${balanceSheet.liabilities.map(item => `
              <tr>
                <td>&nbsp;&nbsp;&nbsp;${item.accountName}</td>
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Liabilities</strong></td>
              <td class="text-right"><strong>$${balanceSheet.totalLiabilities.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="section-header">
              <td colspan="2"><strong>EQUITY</strong></td>
            </tr>
            ${balanceSheet.equity.map(item => `
              <tr>
                <td>&nbsp;&nbsp;&nbsp;${item.accountName}</td>
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr>
              <td>&nbsp;&nbsp;&nbsp;Net Income</td>
              <td class="text-right">$${balanceSheet.netIncome.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Equity</strong></td>
              <td class="text-right"><strong>$${balanceSheet.totalEquity.toFixed(2)}</strong></td>
            </tr>
            <tr><td colspan="2">&nbsp;</td></tr>
            <tr class="grand-total">
              <td><strong>TOTAL LIABILITIES & EQUITY</strong></td>
              <td class="text-right"><strong>$${balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: center; font-weight: bold; color: ${balanceSheet.balanced ? '#28a745' : '#dc3545'};">
          ${balanceSheet.balanced ? '✓ BALANCED' : '✗ UNBALANCED'}
        </div>
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
            📊 Financial Statements
          </h1>
          <span style={{ color: '#666' }}>Income Statement and Balance Sheet</span>
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
            <Button icon={<ReloadOutlined />} onClick={() => { fetchIncomeStatement(); fetchBalanceSheet(); }} block>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="income-statement" size="large">
        <TabPane tab="📈 Income Statement" key="income-statement">
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

              <Card
                style={{ borderRadius: '8px' }}
                extra={
                  <Button type="primary" icon={<DownloadOutlined />} onClick={exportIncomeStatementToPDF}>
                    Export PDF
                  </Button>
                }
              >
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
        </TabPane>

        <TabPane tab="📋 Balance Sheet" key="balance-sheet">
          {balanceSheet && (
            <>
              <Card style={{ marginBottom: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Assets</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
                      ${balanceSheet.totalAssets.toFixed(2)}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Liabilities</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      ${balanceSheet.totalLiabilities.toFixed(2)}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Equity</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      ${balanceSheet.totalEquity.toFixed(2)}
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card
                style={{ borderRadius: '8px' }}
                extra={
                  <Button type="primary" icon={<DownloadOutlined />} onClick={exportBalanceSheetToPDF}>
                    Export PDF
                  </Button>
                }
              >
                <Spin spinning={loadingBS}>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#0066cc', marginBottom: '16px' }}>ASSETS</h3>
                    <Table
                      columns={[
                        { title: 'Account', dataIndex: 'accountName', key: 'accountName', width: '70%' },
                        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: '30%', align: 'right', render: (val: number) => `$${val.toFixed(2)}` }
                      ]}
                      dataSource={balanceSheet.assets}
                      rowKey={(record) => record.accountCode}
                      pagination={false}
                      size="small"
                      summary={() => (
                        <Table.Summary>
                          <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                            <Table.Summary.Cell index={0}>Total Assets</Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">${balanceSheet.totalAssets.toFixed(2)}</Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  </div>

                  <Divider />

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#dc3545', marginBottom: '16px' }}>LIABILITIES</h3>
                    <Table
                      columns={[
                        { title: 'Account', dataIndex: 'accountName', key: 'accountName', width: '70%' },
                        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: '30%', align: 'right', render: (val: number) => `$${val.toFixed(2)}` }
                      ]}
                      dataSource={balanceSheet.liabilities}
                      rowKey={(record) => record.accountCode}
                      pagination={false}
                      size="small"
                      summary={() => (
                        <Table.Summary>
                          <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                            <Table.Summary.Cell index={0}>Total Liabilities</Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">${balanceSheet.totalLiabilities.toFixed(2)}</Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  </div>

                  <Divider />

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#28a745', marginBottom: '16px' }}>EQUITY</h3>
                    <Table
                      columns={[
                        { title: 'Account', dataIndex: 'accountName', key: 'accountName', width: '70%' },
                        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: '30%', align: 'right', render: (val: number) => `$${val.toFixed(2)}` }
                      ]}
                      dataSource={[...balanceSheet.equity, { accountCode: 'NET-INCOME', accountName: 'Net Income', category: '', amount: balanceSheet.netIncome }]}
                      rowKey={(record) => record.accountCode}
                      pagination={false}
                      size="small"
                      summary={() => (
                        <Table.Summary>
                          <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                            <Table.Summary.Cell index={0}>Total Equity</Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">${balanceSheet.totalEquity.toFixed(2)}</Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  </div>

                  <Card style={{ background: balanceSheet.balanced ? '#d4edda' : '#f8d7da', borderRadius: '8px' }}>
                    <Row>
                      <Col span={12}>
                        <h2 style={{ margin: 0 }}>TOTAL LIABILITIES & EQUITY</h2>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0 }}>
                          ${balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}
                        </h2>
                      </Col>
                    </Row>
                    <div style={{ marginTop: '10px', textAlign: 'center', fontWeight: 'bold', color: balanceSheet.balanced ? '#28a745' : '#dc3545' }}>
                      {balanceSheet.balanced ? '✓ BALANCED (Assets = Liabilities + Equity)' : '✗ UNBALANCED'}
                    </div>
                  </Card>
                </Spin>
              </Card>
            </>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
}
