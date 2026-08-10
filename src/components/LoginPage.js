import React from "react";
import { Form, Input, Button, Tabs, message } from "antd";
import { colors } from "../theme";
import { login, register } from "../utils";
import Logo from "./Logo";

class LoginPage extends React.Component {
  state = {
    activeTab: "login",
    loading: false,
  };

  handleFinish = async (values) => {
    this.setState({ loading: true });
    try {
      if (this.state.activeTab === "login") {
        const { username } = await login(values);
        this.props.handleLoginSuccess(username);
        message.success("Welcome back!");
      } else {
        await register(values);
        message.success("Registration successful! Please login.");
        this.setState({ activeTab: "login" });
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const { activeTab, loading } = this.state;

    return (
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 54px)",
          width: "100%",
          backgroundColor: "#f3f4f7",
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: "#f3f4f7",
            padding: "24px 0 24px 24px",
            display: "flex",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundImage:
                "linear-gradient(to right, rgba(26, 31, 61, 0.2), rgba(26, 31, 61, 0.05)), url('/RD.png')",
              backgroundSize: "cover",
              backgroundPosition: "center 60%",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "transparent",
            padding: "0 40px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "380px" }}>
            <div style={{ marginBottom: 36, textAlign: "left" }}>
              <div style={{ marginBottom: 14 }}>
                <Logo size={38} />
              </div>
              <h1
                style={{
                  color: colors.navy,
                  margin: "0 0 4px 0",
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.8px",
                }}
              >
                CityDrop
              </h1>
              <p
                style={{
                  color: colors.muted,
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Dispatch & Delivery Management
              </p>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={(key) => this.setState({ activeTab: key })}
              size="large"
              tabBarStyle={{
                marginBottom: 36,
                borderBottom: "1px solid #cbd5e1",
              }}
              items={[
                { label: "Login", key: "login" },
                { label: "Register", key: "register" },
              ]}
            />

            <Form
              layout="vertical"
              onFinish={this.handleFinish}
              requiredMark={true}
            >
              <Form.Item
                name="username"
                label={
                  <span
                    style={{
                      fontWeight: 600,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  >
                    Username
                  </span>
                }
                rules={[
                  { required: true, message: "Please input your username" },
                ]}
              >
                <Input
                  placeholder="enter your username"
                  style={{
                    height: 42,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: 14,
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={
                  <span
                    style={{
                      fontWeight: 600,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  >
                    Password
                  </span>
                }
                rules={[
                  { required: true, message: "Please input your password" },
                ]}
              >
                <Input.Password
                  placeholder="enter your password"
                  style={{
                    height: 42,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: 14,
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 40, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    backgroundColor: colors.navy,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(26, 31, 61, 0.15)",
                  }}
                >
                  {activeTab === "login" ? "Login" : "Register"}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    );
  }
}

export default LoginPage;
