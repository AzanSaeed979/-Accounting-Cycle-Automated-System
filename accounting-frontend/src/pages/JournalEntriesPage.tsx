import { useEffect, useState } from 'react';
import { Table, Card, Select, Row, Col, Spin, Alert, Tag, Space, Button, Collapse, Modal, Form, Input, DatePicker, InputNumber, message } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';

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
  createdBy?: { name: string };
}

interface Company {
  _id: string;
  name: string;
}

interface Account {
  _id: string;
  code: string;
  name: string;
}

interface JournalEntryFormData {
  company: string;
  date: any;
  referenceNumber?: string;
  description: string;
  type: string;
  lines: Array<{
    account: string;
    debit: number;
    credit: number;
  }>;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [companiesRes, accountsRes] = await Promise.all([
          api.get('/api/companies'),
          api.get('/api/accounts')
        ]);
        setCompanies(companiesRes.data);
        setAccounts(accountsRes.data);
        if (companiesRes.data.length > 0) {
          setSelectedCompanyId(companiesRes.data[0]._id);
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.message || 'Failed to fetch data');
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchEntries();
    }
  }, [selectedCompanyId, filterType]);

  const fetchEntries = async () => {
    try {
      const params: any = { companyId: selectedCompanyId };
      if (filterType) params.type = filterType;

      const res = await api.get('/api/journal-entries', { params });
      setEntries(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch journal entries');
    }
  };

  const calculateTotals = (lines: JournalLine[]) => {
    const debits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const credits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return { debits, credits };
  };

  const showNewEntryModal = () => {
    form.resetFields();
    form.setFieldsValue({
      company: selectedCompanyId,
      date: dayjs(),
      type: 'normal',
      lines: [{ account: undefined, debit: 0, credit: 0 }]
    });
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleSubmit = async (values: JournalEntryFormData) => {
    try {
      // Validate that lines exist and have at least one entry
      if (!values.lines || values.lines.length === 0) {
        message.error('Please add at least one journal line');
        return;
      }

      // Filter out empty lines and format the data
      const validLines = values.lines.filter(line => line.account);

      if (validLines.length === 0) {
        message.error('Please select at least one account');
        return;
      }

      const formattedValues = {
        company: values.company,
        date: values.date.format('YYYY-MM-DD'),
        referenceNumber: values.referenceNumber?.trim() || undefined,
        description: values.description,
        type: values.type || 'normal',
        lines: validLines.map(line => {
          const debit = line.debit ? parseFloat(String(line.debit)) : 0;
          const credit = line.credit ? parseFloat(String(line.credit)) : 0;
          return {
            account: line.account,
            debit: debit,
            credit: credit
          };
        })
      };

      // Validate debits equal credits
      const totalDebits = formattedValues.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredits = formattedValues.lines.reduce((sum, l) => sum + l.credit, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        message.error('Total debits must equal total credits');
        return;
      }

      // Validate each line has either debit or credit, not both
      for (const line of formattedValues.lines) {
        if (line.debit > 0 && line.credit > 0) {
          message.error('Each line cannot have both debit and credit amounts');
          return;
        }
        if (line.debit <= 0 && line.credit <= 0) {
          message.error('Each line must have either a debit or credit amount');
          return;
        }
      }

      console.log('Submitting journal entry:', formattedValues);
      await api.post('/api/journal-entries', formattedValues);
      message.success('Journal entry created successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchEntries();
    } catch (err: any) {
      console.error('Journal entry error:', err.response?.data);
      message.error(err.response?.data?.message || 'Failed to create journal entry');
    }
  };

  const calculateFormTotals = () => {
    const lines = form.getFieldValue('lines') || [];
    const debits = lines.reduce((sum: number, l: any) => sum + (parseFloat(l?.debit) || 0), 0);
    const credits = lines.reduce((sum: number, l: any) => sum + (parseFloat(l?.credit) || 0), 0);
    return { debits, credits, balanced: Math.abs(debits - credits) < 0.01 };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', padding: '24px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const expandedRows = entries.map((entry) => {
    const { debits, credits } = calculateTotals(entry.lines);
    const balanced = Math.abs(debits - credits) < 0.01;

    return (
      <Collapse
        key={entry._id}
        items={[{
          key: entry._id,
          label: (
            <Space>
              <span style={{ fontWeight: 'bold', minWidth: '150px' }}>
                {entry.date && new Date(entry.date).toLocaleDateString()}
              </span>
              <span>{entry.description}</span>
              {entry.referenceNumber && <Tag>{entry.referenceNumber}</Tag>}
              <Tag color={entry.isApproved ? 'green' : 'orange'}>
                {entry.isApproved ? 'Approved' : 'Pending'}
              </Tag>
              <Tag color={balanced ? 'green' : 'red'}>
                {balanced ? 'Balanced' : 'Unbalanced'}
              </Tag>
            </Space>
          ),
          children: (
            <Table
              columns={[
                {
                  title: 'Account',
                  dataIndex: ['account', 'name'],
                  key: 'accountName',
                  render: (_, record: any) => (
                    <span>{record.account.name} ({record.account.code})</span>
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
              rowKey={(record) => `${entry._id}-${record.account._id || record.account}`}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row style={{ fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">${debits.toFixed(2)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">${credits.toFixed(2)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          )
        }]}
        style={{ marginBottom: '12px' }}
      />
    );
  });

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
              📝 Journal Entries
            </h1>
            <span style={{ color: '#666' }}>Total Entries: <strong>{entries.length}</strong></span>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px', borderRadius: '8px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Company"
              value={selectedCompanyId || undefined}
              onChange={setSelectedCompanyId}
              options={companies.map(c => ({ label: c.name, value: c._id }))}
              notFoundContent={companies.length === 0 ? "No companies found. Please create a company first." : "No data"}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by type"
              value={filterType || undefined}
              onChange={setFilterType}
              allowClear
              options={[
                { label: 'All Types', value: '' },
                { label: 'Normal', value: 'normal' },
                { label: 'Adjusting', value: 'adjusting' }
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={showNewEntryModal}
                disabled={!selectedCompanyId}
              >
                New Entry
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchEntries}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '16px' }} />}

      {companies.length === 0 && !loading && (
        <Alert
          message="No Companies Found"
          description="Please create a company first before creating journal entries. Companies are required for journal entries."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Card style={{ borderRadius: '8px' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#999', fontSize: '16px' }}>No journal entries found</p>
          </div>
        ) : (
          expandedRows
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
              {entries.length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Total Entries
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
              {entries.filter(e => e.isApproved).length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Approved
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
              {entries.filter(e => e.type === 'adjusting').length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Adjusting
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>
              {entries.filter(e => {
                const { debits, credits } = calculateTotals(e.lines);
                return Math.abs(debits - credits) >= 0.01;
              }).length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Unbalanced
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Create New Journal Entry"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            company: selectedCompanyId,
            date: dayjs(),
            type: 'normal',
            lines: [{ account: undefined, debit: 0, credit: 0 }]
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Company"
                name="company"
                rules={[{ required: true, message: 'Please select company' }]}
              >
                <Select
                  placeholder="Select company"
                  showSearch
                  optionFilterProp="label"
                  options={companies.map(c => ({ label: c.name, value: c._id }))}
                  notFoundContent={companies.length === 0 ? "No companies found" : "No data"}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Date"
                name="date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Reference Number"
                name="referenceNumber"
              >
                <Input placeholder="Optional reference number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Type"
                name="type"
                rules={[{ required: true, message: 'Please select type' }]}
              >
                <Select
                  placeholder="Select type"
                  options={[
                    { label: 'Normal', value: 'normal' },
                    { label: 'Adjusting', value: 'adjusting' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea rows={2} placeholder="Enter journal entry description" />
          </Form.Item>

          <div style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '16px' }}>
            Journal Lines
          </div>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card key={field.key} size="small" style={{ marginBottom: '12px', background: '#fafafa' }}>
                    <Row gutter={16} align="middle">
                      <Col span={10}>
                        <Form.Item
                          name={[field.name, 'account']}
                          rules={[{ required: true, message: 'Select account' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Select account"
                            showSearch
                            optionFilterProp="label"
                            options={accounts.map(a => ({
                              label: `${a.code} - ${a.name}`,
                              value: a._id
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name={[field.name, 'debit']}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Debit"
                            min={0}
                            precision={2}
                            onChange={(value) => {
                              if (value && value > 0) {
                                const lines = form.getFieldValue('lines');
                                lines[field.name].credit = 0;
                                form.setFieldsValue({ lines });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name={[field.name, 'credit']}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Credit"
                            min={0}
                            precision={2}
                            onChange={(value) => {
                              if (value && value > 0) {
                                const lines = form.getFieldValue('lines');
                                lines[field.name].debit = 0;
                                form.setFieldsValue({ lines });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        )}
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ account: undefined, debit: 0, credit: 0 })}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginBottom: '16px' }}
                >
                  Add Line
                </Button>
              </>
            )}
          </Form.List>

          <Card size="small" style={{ background: '#e6f7ff', marginBottom: '16px' }}>
            <Row>
              <Col span={12}>
                <strong>Total Debits:</strong> ${calculateFormTotals().debits.toFixed(2)}
              </Col>
              <Col span={12}>
                <strong>Total Credits:</strong> ${calculateFormTotals().credits.toFixed(2)}
              </Col>
              <Col span={24} style={{ marginTop: '8px' }}>
                <Tag color={calculateFormTotals().balanced ? 'green' : 'red'}>
                  {calculateFormTotals().balanced ? '✓ Balanced' : '✗ Unbalanced - Debits must equal Credits'}
                </Tag>
              </Col>
            </Row>
          </Card>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" disabled={!calculateFormTotals().balanced}>
                Create Entry
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
