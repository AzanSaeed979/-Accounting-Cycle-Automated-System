import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, DatePicker, Table, Space, Spin, message, Tag } from 'antd';
import { DownloadOutlined, ReloadOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api/client';

const { RangePicker } = DatePicker;

interface Account {
  _id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
}

interface Company {
  _id: string;
  name: string;
}

interface LedgerEntry {
  date: string;
  referenceNumber?: string;
  description: string;
  companyName?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  debit: number;
  credit: number;
  balance?: number;
}

interface LedgerData {
  account: {
    code: string;
    name: string;
    type: string;
    normalBalance: string;
  };
  openingBalance: number;
  entries: LedgerEntry[];
  closingBalance: number;
}

interface AllAccountsLedgerData {
  entries: LedgerEntry[];
  totalEntries: number;
  accountsCount: number;
}

export default function LedgerPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [allAccountsData, setAllAccountsData] = useState<AllAccountsLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year')
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      if (selectedAccountId === 'all') {
        fetchAllAccountsLedger();
      } else if (selectedAccountId) {
        fetchLedger();
      }
    }
  }, [selectedAccountId, selectedCompanyId, dateRange]);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, accountsRes] = await Promise.all([
        api.get('/api/companies'),
        api.get('/api/accounts')
      ]);
      setCompanies(companiesRes.data);
      setAccounts(accountsRes.data);

      // Set default company to "all"
      setSelectedCompanyId('all');

      // Set default account to "all" to show all accounts
      setSelectedAccountId('all');

      setLoading(false);
    } catch (err: any) {
      message.error('Failed to fetch data');
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    if (!selectedAccountId || !selectedCompanyId || selectedAccountId === 'all') return;

    setLoadingLedger(true);
    setAllAccountsData(null);
    try {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      if (selectedCompanyId !== 'all') {
        params.companyId = selectedCompanyId;
      } else {
        params.companyId = 'all';
      }

      const res = await api.get(`/api/accounting-cycle/ledger/${selectedAccountId}`, { params });

      setLedgerData(res.data);
      setLoadingLedger(false);
    } catch (err: any) {
      message.error('Failed to fetch ledger');
      setLoadingLedger(false);
    }
  };

  const fetchAllAccountsLedger = async () => {
    if (!selectedCompanyId) return;

    setLoadingLedger(true);
    setLedgerData(null);
    try {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      if (selectedCompanyId !== 'all') {
        params.companyId = selectedCompanyId;
      } else {
        params.companyId = 'all';
      }

      const res = await api.get('/api/accounting-cycle/ledger-all-accounts', { params });

      setAllAccountsData(res.data);
      setLoadingLedger(false);
    } catch (err: any) {
      message.error('Failed to fetch all accounts ledger');
      setLoadingLedger(false);
    }
  };

  const exportToPDF = () => {
    if (!ledgerData) {
      message.warning('No ledger data to export');
      return;
    }

    const company = companies.find(c => c._id === selectedCompanyId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalDebits = ledgerData.entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = ledgerData.entries.reduce((sum, entry) => sum + entry.credit, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger - ${ledgerData.account.name}</title>
        <style>
          @media print {
            @page { margin: 0.5in; size: landscape; }
            button { display: none; }
          }
          body {
            font-family: 'Arial', sans-serif;
            margin: 20px;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
          }
          .company-name {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 20px;
            font-weight: bold;
            margin: 10px 0;
          }
          .account-info {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border: 2px solid #333;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 14px;
          }
          .info-label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
          }
          th {
            background: #333;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #000;
          }
          td {
            padding: 10px 8px;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .opening-row {
            background: #e3f2fd !important;
            font-weight: bold;
          }
          .closing-row {
            background: #fff3cd !important;
            font-weight: bold;
          }
          .total-row {
            background: #d4edda !important;
            font-weight: bold;
            border-top: 3px solid #000;
          }
          .print-button {
            margin: 20px 0;
            padding: 10px 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          .print-button:hover {
            background: #0052a3;
          }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
        
        <div class="header">
          <div class="company-name">${selectedCompanyId === 'all' ? 'All Companies' : (company?.name || 'Company Name')}</div>
          <div class="report-title">GENERAL LEDGER</div>
          <div>Period: ${dateRange[0].format('MMM DD, YYYY')} to ${dateRange[1].format('MMM DD, YYYY')}</div>
        </div>

        <div class="account-info">
          <div class="info-row">
            <span class="info-label">Account Code:</span>
            <span>${ledgerData.account.code}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Account Name:</span>
            <span>${ledgerData.account.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Account Type:</span>
            <span>${ledgerData.account.type.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Normal Balance:</span>
            <span>${ledgerData.account.normalBalance.toUpperCase()}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: ${selectedCompanyId === 'all' ? '10%' : '12%'}">Date</th>
              <th style="width: ${selectedCompanyId === 'all' ? '8%' : '12%'}">Ref #</th>
              ${selectedCompanyId === 'all' ? '<th style="width: 12%">Company</th>' : ''}
              <th style="width: ${selectedCompanyId === 'all' ? '28%' : '40%'}">Description</th>
              <th style="width: 12%" class="text-right">Debit</th>
              <th style="width: 12%" class="text-right">Credit</th>
              <th style="width: 12%" class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-row">
              <td colspan="${selectedCompanyId === 'all' ? '4' : '3'}"><strong>Opening Balance</strong></td>
              <td class="text-right">-</td>
              <td class="text-right">-</td>
              <td class="text-right"><strong>${ledgerData.openingBalance.toFixed(2)}</strong></td>
            </tr>
            ${ledgerData.entries.map(entry => `
              <tr>
                <td>${dayjs(entry.date).format('MMM DD, YYYY')}</td>
                <td>${entry.referenceNumber || '-'}</td>
                ${selectedCompanyId === 'all' ? `<td>${entry.companyName || 'N/A'}</td>` : ''}
                <td>${entry.description}</td>
                <td class="text-right">${entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                <td class="text-right">${entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                <td class="text-right">${entry.balance.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="${selectedCompanyId === 'all' ? '4' : '3'}"><strong>TOTALS</strong></td>
              <td class="text-right"><strong>${totalDebits.toFixed(2)}</strong></td>
              <td class="text-right"><strong>${totalCredits.toFixed(2)}</strong></td>
              <td class="text-right">-</td>
            </tr>
            <tr class="closing-row">
              <td colspan="${selectedCompanyId === 'all' ? '4' : '3'}"><strong>Closing Balance</strong></td>
              <td class="text-right">-</td>
              <td class="text-right">-</td>
              <td class="text-right"><strong>${ledgerData.closingBalance.toFixed(2)}</strong></td>
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

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: selectedCompanyId === 'all' ? '10%' : '12%',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Ref #',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: selectedCompanyId === 'all' ? '8%' : '10%',
      render: (ref: string) => ref || '-',
    },
    ...(selectedCompanyId === 'all' ? [{
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      width: '12%',
      render: (name: string) => name || 'N/A',
    }] : []),
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: selectedCompanyId === 'all' ? '28%' : '38%',
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: '13%',
      align: 'right' as const,
      render: (debit: number) => debit > 0 ? debit.toFixed(2) : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: '13%',
      align: 'right' as const,
      render: (credit: number) => credit > 0 ? credit.toFixed(2) : '-',
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: '14%',
      align: 'right' as const,
      render: (balance: number) => balance ? <strong>{balance.toFixed(2)}</strong> : '-',
    },
  ];

  const allAccountsColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: '10%',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Ref #',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: '8%',
      render: (ref: string) => ref || '-',
    },
    ...(selectedCompanyId === 'all' ? [{
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      width: '10%',
      render: (name: string) => name || 'N/A',
    }] : []),
    {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      width: selectedCompanyId === 'all' ? '15%' : '18%',
      render: (name: string, record: LedgerEntry) => (
        <span>
          <Tag color="blue" style={{ marginRight: 4 }}>{record.accountCode}</Tag>
          {name}
        </span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: selectedCompanyId === 'all' ? '20%' : '25%',
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: '12%',
      align: 'right' as const,
      render: (debit: number) => debit > 0 ? debit.toFixed(2) : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: '12%',
      align: 'right' as const,
      render: (credit: number) => credit > 0 ? credit.toFixed(2) : '-',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            📒 General Ledger
          </h1>
          <span style={{ color: '#666' }}>View account-wise transactions in ledger format</span>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px', borderRadius: '8px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Company"
              value={selectedCompanyId || undefined}
              onChange={setSelectedCompanyId}
              options={[
                { label: 'All Companies', value: 'all' },
                ...companies.map(c => ({ label: c.name, value: c._id }))
              ]}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Account"
              value={selectedAccountId || undefined}
              onChange={setSelectedAccountId}
              options={[
                { label: 'All Accounts', value: 'all' },
                ...accounts.map(a => ({ label: `${a.code} - ${a.name}`, value: a._id }))
              ]}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space style={{ width: '100%' }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={selectedAccountId === 'all' ? fetchAllAccountsLedger : fetchLedger}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={exportToPDF}
                disabled={!ledgerData && !allAccountsData}
              >
                PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {allAccountsData && (
        <>
          <Card style={{ marginBottom: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ fontSize: '12px', color: '#666' }}>View</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  All Accounts Ledger
                </div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Accounts</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc' }}>
                  {allAccountsData.accountsCount}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Transactions</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                  {allAccountsData.totalEntries}
                </div>
              </Col>
            </Row>
          </Card>

          <Card style={{ borderRadius: '8px' }}>
            <Table
              columns={allAccountsColumns}
              dataSource={allAccountsData.entries}
              rowKey={(record) => `${record.date}-${record.accountCode}-${record.description}-${record.debit}-${record.credit}`}
              pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100', '200'] }}
              loading={loadingLedger}
              locale={{ emptyText: 'No transactions found' }}
              summary={() => {
                const totalDebits = allAccountsData.entries.reduce((sum, entry) => sum + entry.debit, 0);
                const totalCredits = allAccountsData.entries.reduce((sum, entry) => sum + entry.credit, 0);
                const colSpan = selectedCompanyId === 'all' ? 5 : 4;
                return (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={colSpan}>TOTALS</Table.Summary.Cell>
                      <Table.Summary.Cell index={colSpan} align="right">${totalDebits.toFixed(2)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={colSpan + 1} align="right">${totalCredits.toFixed(2)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </>
      )}

      {ledgerData && (
        <>
          <Card style={{ marginBottom: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#666' }}>Account</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {ledgerData.account.code} - {ledgerData.account.name}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#666' }}>Type</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  <Tag color="blue">{ledgerData.account.type.toUpperCase()}</Tag>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#666' }}>Opening Balance</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc' }}>
                  ${ledgerData.openingBalance.toFixed(2)}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#666' }}>Closing Balance</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                  ${ledgerData.closingBalance.toFixed(2)}
                </div>
              </Col>
            </Row>
          </Card>

          <Card style={{ borderRadius: '8px' }}>
            <Table
              columns={columns}
              dataSource={ledgerData.entries}
              rowKey={(record) => `${record.date}-${record.description}-${record.debit}-${record.credit}`}
              pagination={{ pageSize: 50 }}
              loading={loadingLedger}
              locale={{ emptyText: 'No transactions found for this account' }}
              summary={() => {
                const totalDebits = ledgerData.entries.reduce((sum, entry) => sum + entry.debit, 0);
                const totalCredits = ledgerData.entries.reduce((sum, entry) => sum + entry.credit, 0);
                const colSpan = selectedCompanyId === 'all' ? 4 : 3;
                return (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={colSpan}>TOTALS</Table.Summary.Cell>
                      <Table.Summary.Cell index={colSpan} align="right">${totalDebits.toFixed(2)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={colSpan + 1} align="right">${totalCredits.toFixed(2)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={colSpan + 2} align="right">-</Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </>
      )}

      {!ledgerData && !allAccountsData && !loadingLedger && selectedAccountId && (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>
            Select a company and account to view the ledger
          </p>
        </Card>
      )}
    </div>
  );
}
