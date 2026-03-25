import { useEffect, useState } from 'react';
import { Table, Card, Row, Col, Spin, Alert, Tag, Space, Button, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';

interface Company {
  _id: string;
  name: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;
  contactEmail: string;
  contactPhone?: string;
  currency: string;
  accountingPeriodStart: string;
  accountingPeriodEnd: string;
  isActive: boolean;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/api/companies');
      setCompanies(res.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch companies');
      setLoading(false);
    }
  };

  const showAddModal = () => {
    setIsEditMode(false);
    setEditingCompany(null);
    form.resetFields();
    form.setFieldsValue({
      businessType: 'software-house',
      currency: 'USD',
      accountingPeriodStart: dayjs().startOf('year'),
      accountingPeriodEnd: dayjs().endOf('year'),
    });
    setIsModalVisible(true);
  };

  const showEditModal = (company: Company) => {
    setIsEditMode(true);
    setEditingCompany(company);
    form.setFieldsValue({
      ...company,
      accountingPeriodStart: dayjs(company.accountingPeriodStart),
      accountingPeriodEnd: dayjs(company.accountingPeriodEnd),
    });
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingCompany(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      const formattedValues = {
        ...values,
        accountingPeriodStart: values.accountingPeriodStart.format('YYYY-MM-DD'),
        accountingPeriodEnd: values.accountingPeriodEnd.format('YYYY-MM-DD'),
      };

      if (isEditMode && editingCompany) {
        await api.put(`/api/companies/${editingCompany._id}`, formattedValues);
        message.success('Company updated successfully');
      } else {
        await api.post('/api/companies', formattedValues);
        message.success('Company created successfully');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchCompanies();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save company');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Company',
      content: 'Are you sure you want to delete this company?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await api.delete(`/api/companies/${id}`);
          message.success('Company deleted successfully');
          fetchCompanies();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Failed to delete company');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Business Type',
      dataIndex: 'businessType',
      key: 'businessType',
      render: (type: string) => <Tag color="blue">{type.replace('-', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Registration #',
      dataIndex: 'registrationNumber',
      key: 'registrationNumber',
    },
    {
      title: 'Tax ID',
      dataIndex: 'taxId',
      key: 'taxId',
    },
    {
      title: 'Contact Email',
      dataIndex: 'contactEmail',
      key: 'contactEmail',
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency: string) => <Tag>{currency}</Tag>,
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
      render: (_: any, record: Company) => (
        <Space size="small">
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)}>
            Edit
          </Button>
          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
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
              🏢 Companies
            </h1>
            <span style={{ color: '#666' }}>Total Companies: <strong>{companies.length}</strong></span>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px', borderRadius: '8px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Button type="primary" icon={<PlusOutlined />} block onClick={showAddModal}>
              Add Company
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button icon={<ReloadOutlined />} block onClick={fetchCompanies}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '16px' }} />}

      <Card style={{ borderRadius: '8px' }}>
        <Table
          columns={columns}
          dataSource={companies}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
          locale={{ emptyText: 'No companies found. Click Add Company to create one.' }}
        />
      </Card>

      <Modal
        title={isEditMode ? 'Edit Company' : 'Create New Company'}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Company Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Tech Solutions Inc." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Business Type" name="businessType" rules={[{ required: true }]}>
                <Select options={[
                  { label: 'Software House', value: 'software-house' },
                  { label: 'IT Services', value: 'it-services' },
                  { label: 'Freelancing Agency', value: 'freelancing-agency' },
                  { label: 'App Development', value: 'app-development' },
                  { label: 'Computer Services', value: 'computer-services' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Registration Number" name="registrationNumber" rules={[{ required: true }]}>
                <Input placeholder="REG-2024-001" disabled={isEditMode} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tax ID" name="taxId" rules={[{ required: true }]}>
                <Input placeholder="TAX123456789" disabled={isEditMode} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Contact Email" name="contactEmail" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="info@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Contact Phone" name="contactPhone">
                <Input placeholder="+1-234-567-8900" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Currency" name="currency" rules={[{ required: true }]}>
                <Select showSearch options={[
                  { label: 'USD', value: 'USD' },
                  { label: 'EUR', value: 'EUR' },
                  { label: 'GBP', value: 'GBP' },
                  { label: 'PKR', value: 'PKR' },
                  { label: 'INR', value: 'INR' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Period Start" name="accountingPeriodStart" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Period End" name="accountingPeriodEnd" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">{isEditMode ? 'Update' : 'Create'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
