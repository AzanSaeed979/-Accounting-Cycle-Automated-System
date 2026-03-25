import { useEffect, useState } from 'react';
import { Table, Card, Select, Row, Col, Spin, Alert, Tag, Space, Input, Button, Modal, Form, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../api/client';

interface Account {
  _id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  normalBalance: string;
  description?: string;
  isActive: boolean;
  openingBalance?: number;
}

interface AccountFormData {
  code: string;
  name: string;
  type: string;
  category: string;
  normalBalance: string;
  description?: string;
  openingBalance?: number;
  isHeaderAccount?: boolean;
  parentAccount?: string;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAccounts();
  }, [filterType]);

  const fetchAccounts = async () => {
    try {
      const params: any = {};
      if (filterType) params.type = filterType;

      const res = await api.get('/api/accounts', { params });
      setAccounts(res.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch accounts');
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.code.toLowerCase().includes(searchText.toLowerCase()) ||
    account.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    const colors: any = {
      asset: 'blue',
      liability: 'red',
      equity: 'green',
      revenue: 'cyan',
      expense: 'orange'
    };
    return colors[type] || 'default';
  };

  const categoryOptions: Record<string, { label: string; value: string }[]> = {
    asset: [
      { label: 'Current Asset', value: 'current-asset' },
      { label: 'Non-Current Asset', value: 'noncurrent-asset' },
      { label: 'Tangible Asset', value: 'tangible-asset' },
      { label: 'Intangible Asset', value: 'intangible-asset' },
    ],
    liability: [
      { label: 'Current Liability', value: 'current-liability' },
      { label: 'Non-Current Liability', value: 'noncurrent-liability' },
    ],
    equity: [
      { label: 'Capital Equity', value: 'capital-equity' },
      { label: 'Retained Earnings', value: 'retained-earnings' },
    ],
    revenue: [
      { label: 'Operating Revenue', value: 'operating-revenue' },
      { label: 'Non-Operating Revenue', value: 'nonoperating-revenue' },
    ],
    expense: [
      { label: 'Operating Expense', value: 'operating-expense' },
      { label: 'Non-Operating Expense', value: 'nonoperating-expense' },
      { label: 'Cost of Revenue', value: 'cost-of-revenue' },
    ],
  };

  const showAddModal = () => {
    setIsEditMode(false);
    setEditingAccount(null);
    setSelectedType('');
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (account: Account) => {
    setIsEditMode(true);
    setEditingAccount(account);
    setSelectedType(account.type);
    form.setFieldsValue({
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category,
      normalBalance: account.normalBalance,
      description: account.description,
      openingBalance: account.openingBalance,
    });
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSelectedType('');
    form.resetFields();
    setEditingAccount(null);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setFieldsValue({ category: undefined });
  };

  const handleSubmit = async (values: AccountFormData) => {
    try {
      if (isEditMode && editingAccount) {
        await api.put(`/api/accounts/${editingAccount._id}`, values);
        message.success('Account updated successfully');
      } else {
        await api.post('/api/accounts', values);
        message.success('Account created successfully');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchAccounts();
    } catch (err: any) {
      message.error(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} account`);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Account',
      content: 'Are you sure you want to delete this account?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          await api.delete(`/api/accounts/${id}`);
          message.success('Account deleted successfully');
          fetchAccounts();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Failed to delete account');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: Account, b: Account) => a.code.localeCompare(b.code),
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Account, b: Account) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={getTypeColor(type)}>{type.toUpperCase()}</Tag>,
      filters: [
        { text: 'Asset', value: 'asset' },
        { text: 'Liability', value: 'liability' },
        { text: 'Equity', value: 'equity' },
        { text: 'Revenue', value: 'revenue' },
        { text: 'Expense', value: 'expense' }
      ],
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      sorter: (a: Account, b: Account) => a.category.localeCompare(b.category),
    },
    {
      title: 'Normal Balance',
      dataIndex: 'normalBalance',
      key: 'normalBalance',
      render: (balance: string) => <Tag color={balance?.toLowerCase() === 'debit' ? 'blue' : 'purple'}>{balance?.toUpperCase()}</Tag>
    },
    {
      title: 'Opening Balance',
      dataIndex: 'openingBalance',
      key: 'openingBalance',
      render: (balance: number) => `$${(balance || 0).toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Account) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Edit
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </Space>
      ),
    }
  ];

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
          <Space direction="vertical" style={{ width: '100%' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
              📊 Chart of Accounts
            </h1>
            <span style={{ color: '#666' }}>Total Accounts: <strong>{accounts.length}</strong></span>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px', borderRadius: '8px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search code or name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by type"
              value={filterType || undefined}
              onChange={setFilterType}
              allowClear
              options={[
                { label: 'All Types', value: '' },
                { label: 'Assets', value: 'asset' },
                { label: 'Liabilities', value: 'liability' },
                { label: 'Equity', value: 'equity' },
                { label: 'Revenue', value: 'revenue' },
                { label: 'Expenses', value: 'expense' }
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={showAddModal}
            >
              Add Account
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              icon={<ReloadOutlined />}
              block
              onClick={fetchAccounts}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '16px' }} />}

      <Card style={{ borderRadius: '8px' }}>
        <Table
          columns={columns}
          dataSource={filteredAccounts}
          rowKey="_id"
          pagination={{ pageSize: 20, total: filteredAccounts.length }}
          size="middle"
          loading={loading}
          locale={{
            emptyText: 'No accounts found'
          }}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
              {filteredAccounts.length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Total Accounts
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
              {filteredAccounts.filter(a => a.isActive).length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Active Accounts
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
              {filteredAccounts.filter(a => a.type === 'asset').length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Assets
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>
              {filteredAccounts.filter(a => a.type === 'liability').length}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              Liabilities
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title={isEditMode ? 'Edit Account' : 'Add New Account'}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            normalBalance: 'debit',
            openingBalance: 0,
          }}
        >
          <Form.Item
            label="Account Code"
            name="code"
            rules={[{ required: true, message: 'Please enter account code' }]}
          >
            <Input placeholder="e.g., 1000" disabled={isEditMode} />
          </Form.Item>

          <Form.Item
            label="Account Name"
            name="name"
            rules={[{ required: true, message: 'Please enter account name' }]}
          >
            <Input placeholder="e.g., Cash" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Account Type"
                name="type"
                rules={[{ required: true, message: 'Please select account type' }]}
              >
                <Select
                  placeholder="Select type"
                  onChange={handleTypeChange}
                  options={[
                    { label: 'Asset', value: 'asset' },
                    { label: 'Liability', value: 'liability' },
                    { label: 'Equity', value: 'equity' },
                    { label: 'Revenue', value: 'revenue' },
                    { label: 'Expense', value: 'expense' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select
                  placeholder="Select category"
                  options={categoryOptions[selectedType] || []}
                  disabled={!selectedType}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Normal Balance"
                name="normalBalance"
                rules={[{ required: true, message: 'Please select normal balance' }]}
              >
                <Select
                  placeholder="Select balance"
                  options={[
                    { label: 'Debit', value: 'debit' },
                    { label: 'Credit', value: 'credit' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Opening Balance"
                name="openingBalance"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Optional description"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {isEditMode ? 'Update' : 'Create'} Account
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
