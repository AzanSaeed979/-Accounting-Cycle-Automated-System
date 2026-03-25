import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: { email: string; password: string }) {
    setError(null);
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top left, #e6f4ff 0, #ffffff 40%, #f5f5f5 100%)',
      }}
    >
      <div
        style={{
          width: 380,
          padding: 32,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 18px 45px rgba(0,0,0,0.08)',
        }}
      >
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          Azan Accounting
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
          Sign in to manage your software house finances
        </Text>

        {error && (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            message={error}
            showIcon
          />
        )}

        <Form
          name="login"
          style={{ marginTop: 24 }}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Please input your email' }]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="you@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">Don&apos;t have an account? </Text>
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
