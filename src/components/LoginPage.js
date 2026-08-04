import React from 'react';
import { Tabs, Form, Input, Button, message } from 'antd';
import { colors } from '../theme';
import { login, register } from '../utils';

// No hooks (no useState) — state lives on `this.state`, matching
// staybooking/staysbookingfe/src/components/LoginPage.js.
class LoginPage extends React.Component {
  state = {
    activeTab: 'login',
    loginLoading: false,
    registerLoading: false,
  };

  handleLogin = async (values) => {
    this.setState({ loginLoading: true });
    try {
      const result = await login({ email: values.email, password: values.password });
      // this.props.handleLoginSuccess was passed down from App.js — calling
      // it is this version's replacement for navigate('/home').
      this.props.handleLoginSuccess(result.token, result.email);
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ loginLoading: false });
    }
  };

  handleRegister = async (values) => {
    this.setState({ registerLoading: true });
    try {
      await register({ email: values.email, password: values.password });
      message.success('Registration successful — you can now log in.');
      this.setState({ activeTab: 'login' });
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ registerLoading: false });
    }
  };

  render() {
    const items = [
      {
        key: 'login',
        label: 'Login',
        children: (
          <Form
            layout="vertical"
            onFinish={this.handleLogin}
            initialValues={{ email: 'demo@citydrop.app', password: '123456' }}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={this.state.loginLoading}>
              Login
            </Button>
          </Form>
        ),
      },
      {
        key: 'register',
        label: 'Register',
        children: (
          <Form layout="vertical" onFinish={this.handleRegister}>
            <Form.Item name="email" label="Email (used as username)" rules={[{ required: true }]}>
              <Input placeholder="your@email.com" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password placeholder="Choose a password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={this.state.registerLoading}>
              Register
            </Button>
          </Form>
        ),
      },
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 380, padding: 32, border: `1px solid ${colors.border}`, borderRadius: 12, background: '#fff' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontWeight: 'bold', fontSize: 20, color: colors.navy }}>CityDrop</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Dispatch &amp; Delivery Management</div>
          </div>
          <Tabs
            activeKey={this.state.activeTab}
            onChange={(key) => this.setState({ activeTab: key })}
            items={items}
            centered
          />
        </div>
      </div>
    );
  }
}

export default LoginPage;
