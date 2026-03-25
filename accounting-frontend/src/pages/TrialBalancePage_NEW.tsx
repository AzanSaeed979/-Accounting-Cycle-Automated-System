import { useEffect, useState } from 'react';
import { Table, Card, Select, Row, Col, Spin, Alert, Space, Button, DatePicker, message, Tag, Modal, Collapse, Divider, Statistic, Switch } from 'antd';
import { DownloadOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, FileSearchOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api/client';

const { RangePicker } = DatePicker;

interface Company {
  _id: string;
  name: string;
}

interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

interface JournalLine {
  account: any;
  debit: number;
  credit: number;
}

interface JournalEntry {
  _id: string;
  date: string;
  referenceNumber?: string;
  description: string;
  type: string;
  lines: JournalLine[];
  isApproved: boolean;
}

export default function TrialBalancePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTB, setLoadingTB] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year')
  ]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBalancingModal, setShowBalancingModal] = useState(false);
  const [showAdjustedTB, setShowAdjustedTB] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchTrialBalance();
    }
  }, [selectedCompanyId, dateRange, showAdjustedTB]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/api/companies');
      setCompanies(res.data);
      if (res.data.length > 0) {
        setSelectedCompanyId('all');
      }
      setLoading(false);
    } catch (err: any) {
      setError('Failed to fetch companies');
      setLoading(false);
    }
  };

  const fetchTrialBalance = async () => {
    if (!selectedCompanyId) return;

    setLoadingTB(true);
    try {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };
      
      if (selectedCompanyId !== 'all') {
        params.companyId = selectedCompanyId;
      }

      // If showing adjusted TB, only include adjusting entries
      if (showAdjustedTB) {
        params.includeAdjusting = true;
      }

      const jeParams: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };
      
      if (selectedCompanyId !== 'all') {
        jeParams.companyId = selectedCompanyId;
      }

      const [tbRes, jeRes] = await Promise.all([
        api.get('/api/accounting-cycle/trial-balance', { params }),
        api.get('/api/journal-entries', { params: jeParams })
      ]);
      
      setTrialBalance(tbRes.data);
      setJournalEntries(jeRes.data);
      setLoadingTB(false);
    } catch (err: any) {
      message.error('Failed to fetch trial balance');
      setLoadingTB(false);
    }
  };

  const exportToPDF = () => {
    if (!trialBalance) {
      message.warning('No data to export');
      return;
    }

    const company = companies.find(c => c._id === selectedCompanyId);
    const companyName = selectedCompanyId === 'all' ? 'All Companies' : (company?.name || 'Company Name');
    const reportTitle = showAdjustedTB ? 'ADJUSTED TRIAL BALANCE' : 'TRIAL BALANCE';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            button { display: none; }
          }
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 15px; }
          .company-name { font-size: 26px; font-weight: bold; }
          .report-title { font-size: 20px; font-weight: bold; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #333; color: white; padding: 12px; text-align: left; border: 1px solid #000; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          .total-row { background: #d4edda !important; font-weight: bold; border-top: 3px solid #000; }
          .balanced { color: #28a745; font-weight: bold; }
          .unbalanced { color: #dc3545; font-weight: bold; }
          .print-button { margin: 20px 0; padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="report-title">${reportTitle}</div>
          <div>Period: ${dateRange[0].format('MMM DD, YYYY')} to ${dateRange[1].format('MMM DD, YYYY')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%">Code</th>
              <th style="width: 45%">Account Name</th>
              <th style="width: 20%" class="text-right">Debit</th>
              <th style="width: 20%" class="text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${trialBalance.accounts.map(acc => `
              <tr>
                <td>${acc.accountCode}</td>
                <td>${acc.accountName}</td>
                <td class="text-right">${acc.debit > 0 ? acc.debit.toFixed(2) : '-'}</td>
                <td class="text-right">${acc.credit > 0 ? acc.credit.toFixed(2) : '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2"><strong>TOTALS</strong></td>
              <td class="text-right"><strong>${trialBalance.totalDebits.toFixed(2)}</strong></td>
              <td class="text-right"><strong>${trialBalance.totalCredits.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 30px; text-align: center;">
          <p class="${trialBalance.balanced ? 'balanced' : 'unbalanced'}">
            ${trialBalance.balanced ? '✓ BALANCED' : '✗ UNBALANCED'}
          </p>
          <p style="font-size: 12px; color: #666;">
            Generated on ${dayjs().format('MMMM DD, YYYY [at] HH:mm:ss')}
          </p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const calculateEntryTotals = (lines: JournalLine[]) => {
    const debits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const credits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return { debits, credits, balanced: Math.abs(debits - credits) < 0.01 };
  };

  const getUnbalancedEntries = () => {
    return journalEntries.filter(entry => {
      const { balanced } = calculateEntryTotals(entry.lines);
      return !balanced;
    });
  };

  const getAdjustingEntries = () => {
    return journalEntries.filter(entry => entry.type === 'adjusting');
  };

  const showDetailedRecords = () => {
    setShowDetailsModal(true);
  };

  const showBalancingHelper = () => {
    setShowBalancingModal(true);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: '15%',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      key: 'accountName',
      width: '45%',
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: '20%',
      align: 'right' as const,
      render: (value: number) => value > 0 ? `${value.toFixed(2)}` : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: '20%',
      align: 'right' as const,
      render: (value: number) => value > 0 ? `${value.toFixed(2)}` : '-',
    }
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
            ⚖️ {showAdjustedTB ? 'Adjusted Trial Balance' : 'Trial Balance'}
          </h1>
          <span style={{ color: '#666' }}>
            {showAdjustedTB ? 'Trial Balance including adjusting entries' : 'Verify that debits equal credits'}
          </span>
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
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Switch
                checked={showAdjustedTB}
                onChange={setShowAdjustedTB}
                checkedChildren="Adjusted"
                unCheckedChildren="Normal"
              />
              <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                {showAdjustedTB ? 'Adjusted TB' : 'Normal TB'}
              </span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchTrialBalance}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={exportToPDF}
                disabled={!trialBalance}
              >
                PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '16px' }} />}

      {showAdjustedTB && (
        <Alert
          message="Adjusted Trial Balance Mode"
          description={`Showing trial balance with all entries including ${getAdjustingEntries().length} adjusting entries. This reflects the adjusted balances after period-end adjustments.`}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {trialBalance && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Debits</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
                  ${trialBalance.totalDebits.toFixed(2)}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Credits</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>
                  ${trialBalance.totalCredits.toFixed(2)}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{
                textAlign: 'center',
                borderRadius: '8px',
                background: trialBalance.balanced ? '#f6ffed' : '#fff1f0',
                border: `2px solid ${trialBalance.balanced ? '#52c41a' : '#f5222d'}`
              }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Status</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: trialBalance.balanced ? '#52c41a' : '#f5222d' }}>
                  {trialBalance.balanced ? <><CheckCircleOutlined /> BALANCED</> : <><CloseCircleOutlined /> UNBALANCED</>}
                </div>
              </Card>
            </Col>
          </Row>

          {!trialBalance.balanced && (
            <Alert
              message="Trial Balance is Unbalanced"
              description={
                <div>
                  <p>Difference: <strong>${Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)}</strong></p>
                  <p>This means there are errors in your journal entries. Use the tools below to identify and fix them.</p>
                  <Space style={{ marginTop: '12px' }}>
                    <Button type="primary" icon={<FileSearchOutlined />} onClick={showDetailedRecords}>
                      View All Journal Entries
                    </Button>
                    <Button icon={<ToolOutlined />} onClick={showBalancingHelper}>
                      Balancing Helper
                    </Button>
                  </Space>
                </div>
              }
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: '24px' }}
            />
          )}

          {trialBalance.balanced && (
            <Alert
              message="Trial Balance is Balanced ✓"
              description="All journal entries are correct. You can proceed to generate financial statements."
              type="success"
              showIcon
              style={{ marginBottom: '24px' }}
              action={
                <Button size="small" type="link" onClick={showDetailedRecords}>
                  View Records
                </Button>
              }
            />
          )}

          <Card style={{ borderRadius: '8px' }}>
            <Table
              columns={columns}
              dataSource={trialBalance.accounts}
              rowKey={(record) => record.accountCode}
              pagination={{ pageSize: 50 }}
              loading={loadingTB}
              locale={{ emptyText: 'No accounts found' }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row style={{ background: '#f0f7ff', fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>TOTALS</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      ${trialBalance.totalDebits.toFixed(2)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      ${trialBalance.totalCredits.toFixed(2)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </>
      )}

      {/* Detailed Records Modal */}
      <Modal
        title="📋 All Journal Entries"
        open={showDetailsModal}
        onCancel={() => setShowDetailsModal(false)}
        footer={null}
        width={1000}
      >
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="Total Entries" value={journalEntries.length} />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Balanced Entries" 
                value={journalEntries.filter(e => calculateEntryTotals(e.lines).balanced).length}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Unbalanced Entries" 
                value={getUnbalancedEntries().length}
                valueStyle={{ color: '#f5222d' }}
              />
            </Col>
          </Row>
        </div>

        <Divider />

        <Collapse>
          {journalEntries.map(entry => {
            const { debits, credits, balanced } = calculateEntryTotals(entry.lines);
            return (
              <Collapse.Panel
                key={entry._id}
                header={
                  <Space>
                    <span style={{ fontWeight: 'bold', minWidth: '120px' }}>
                      {dayjs(entry.date).format('MMM DD, YYYY')}
                    </span>
                    <span>{entry.description}</span>
                    {entry.referenceNumber && <Tag color="blue">{entry.referenceNumber}</Tag>}
                    <Tag color={entry.type === 'adjusting' ? 'orange' : 'default'}>
                      {entry.type}
                    </Tag>
                    <Tag color={balanced ? 'green' : 'red'}>
                      {balanced ? '✓ Balanced' : '✗ Unbalanced'}
                    </Tag>
                  </Space>
                }
                style={{ 
                  marginBottom: '8px',
                  border: balanced ? '1px solid #d9d9d9' : '2px solid #ff4d4f'
                }}
              >
                <Table
                  columns={[
                    {
                      title: 'Account',
                      dataIndex: ['account', 'name'],
                      key: 'accountName',
                      render: (_, record: any) => (
                        <span>
                          <strong>{record.account.code}</strong> - {record.account.name}
                        </span>
                      )
                    },
                    {
                      title: 'Debit',
                      dataIndex: 'debit',
                      key: 'debit',
                      align: 'right' as const,
                      render: (value: number) => value > 0 ? `$${value.toFixed(2)}` : '-'
                    },
                    {
                      title: 'Credit',
                      dataIndex: 'credit',
                      key: 'credit',
                      align: 'right' as const,
                      render: (value: number) => value > 0 ? `$${value.toFixed(2)}` : '-'
                    }
                  ]}
                  dataSource={entry.lines}
                  rowKey={(record) => `${entry._id}-${record.account._id}`}
                  pagination={false}
                  size="small"
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ 
                        fontWeight: 'bold',
                        background: balanced ? '#f6ffed' : '#fff1f0'
                      }}>
                        <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          ${debits.toFixed(2)}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          ${credits.toFixed(2)}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                      {!balanced && (
                        <Table.Summary.Row style={{ background: '#fff1f0', color: '#f5222d' }}>
                          <Table.Summary.Cell index={0}>
                            <strong>⚠️ Difference</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} colSpan={2} align="right">
                            <strong>${Math.abs(debits - credits).toFixed(2)}</strong>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                    </Table.Summary>
                  )}
                />
              </Collapse.Panel>
            );
          })}
        </Collapse>
      </Modal>

      {/* Balancing Helper Modal */}
      <Modal
        title="🔧 Trial Balance Balancing Helper"
        open={showBalancingModal}
        onCancel={() => setShowBalancingModal(false)}
        footer={null}
        width={800}
      >
        {trialBalance && (
          <>
            <Card style={{ marginBottom: '16px', background: '#fff1f0' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="Total Debits" 
                    value={trialBalance.totalDebits.toFixed(2)}
                    prefix="$"
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Total Credits" 
                    value={trialBalance.totalCredits.toFixed(2)}
                    prefix="$"
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Difference" 
                    value={Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)}
                    prefix="$"
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Col>
              </Row>
            </Card>

            <Divider orientation="left">Problem Analysis</Divider>

            {getUnbalancedEntries().length > 0 ? (
              <>
                <Alert
                  message={`Found ${getUnbalancedEntries().length} Unbalanced Journal Entries`}
                  description="These entries have unequal debits and credits. Fix them to balance your trial balance."
                  type="error"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />

                <div style={{ marginBottom: '16px' }}>
                  <h4>Unbalanced Entries:</h4>
                  {getUnbalancedEntries().map(entry => {
                    const { debits, credits } = calculateEntryTotals(entry.lines);
                    return (
                      <Card key={entry._id} size="small" style={{ marginBottom: '8px', borderColor: '#ff4d4f' }}>
                        <Row>
                          <Col span={12}>
                            <strong>{dayjs(entry.date).format('MMM DD, YYYY')}</strong>
                            <br />
                            {entry.description}
                            {entry.referenceNumber && <Tag color="blue">{entry.referenceNumber}</Tag>}
                          </Col>
                          <Col span={12} style={{ textAlign: 'right' }}>
                            <div>Debits: ${debits.toFixed(2)}</div>
                            <div>Credits: ${credits.toFixed(2)}</div>
                            <div style={{ color: '#f5222d', fontWeight: 'bold' }}>
                              Difference: ${Math.abs(debits - credits).toFixed(2)}
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <Alert
                message="No Unbalanced Journal Entries Found"
                description="All individual jo             />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
 ) : (
                  <li>Add a <strong>DEBIT</strong> of ${Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)} to a suspense account</li>
                )}
              </ul>

              <Alert
                message="Tip"
                description="Create a 'Suspense Account' in your Chart of Accounts to temporarily hold the difference while you investigate the root cause."
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
        <Divider />

              <h4>Need to Create a Correcting Entry?</h4>
              <p>If debits are higher than credits by ${Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)}:</p>
              <ul style={{ marginLeft: '20px' }}>
                {trialBalance.totalDebits > trialBalance.totalCredits ? (
                  <li>Add a <strong>CREDIT</strong> of ${Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)} to a suspense account</li>
               /strong> Go to Chart of Accounts and verify opening balances are correct.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Create Correcting Entry:</strong> If you can't edit an approved entry, create a new correcting journal entry.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Refresh Trial Balance:</strong> Click the Refresh button to see updated results.
                </li>
              </ol>

       }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Review Unbalanced Entries:</strong> Go to Journal Entries page and look for entries with red "Unbalanced" tags.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Edit or Delete:</strong> Fix the amounts in each unbalanced entry so debits equal credits.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Check Opening Balances:<urnal entries are balanced, but the trial balance is still unbalanced. This might be due to opening balances or data inconsistency."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            <Divider orientation="left">How to Fix</Divider>

            <div style={{ padding: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
              <h4>Step-by-Step Solution:</h4>
              <ol style={{ marginLeft: '20px' 