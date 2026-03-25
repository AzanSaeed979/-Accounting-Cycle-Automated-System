import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: {
    name: string;
    email: string;
    password: string;
  }) {
    setError(null);
    setLoading(true);
    try {
      await register(values.name, values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed');
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
          width: 420,
          padding: 32,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 18px 45px rgba(0,0,0,0.08)',
        }}
      >
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          Create an account
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
          Set up access to your software house accounting workspace
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
          name="register"
          style={{ marginTop: 24 }}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="name"
            label="Full name"
            rules={[{ required: true, message: 'Please input your name' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Azan Saeed"
              size="large"
            />
          </Form.Item>

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
              Create account
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">Already have an account? </Text>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
