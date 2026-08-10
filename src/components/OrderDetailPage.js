import React from "react";
import { Typography, Card, Steps, Descriptions, Space, Spin, message } from "antd";
import { getOrder } from "../utils";
import { modeLabel, statusLabel, STATUS_SEQUENCE } from "../orderUtils";
import { RobotHeroBanner } from "./VehicleArt";

const { Title, Text } = Typography;

const iconChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 8,
  background: "#eaf0fc",
  marginRight: 6,
  fontSize: 13,
};

class OrderDetailPage extends React.Component {
  state = {
    order: null,
    loading: true,
  };

  componentDidMount() {
    this.load();
    // Same reasoning as MyOrdersPage: status advances on the server side
    // (mock ticker today, real dispatch updates later) with nothing pushing
    // that change to the browser, so this page polls while it's open.
    this.pollTimer = setInterval(this.refresh, 4000);
  }

  componentWillUnmount() {
    clearInterval(this.pollTimer);
  }

  load = () => {
    const { orderId } = this.props;
    this.setState({ loading: true });
    getOrder(orderId)
      .then((order) => this.setState({ order, loading: false }))
      .catch((err) => {
        message.error(err.message);
        this.setState({ loading: false });
      });
  };

  // Silent refresh for the poll — no spinner, no error toast, and it stops
  // once the order is delivered since the status can't move further.
  refresh = () => {
    const { orderId } = this.props;
    if (this.state.order && this.state.order.status === "DELIVERED") {
      clearInterval(this.pollTimer);
      return;
    }
    getOrder(orderId)
      .then((order) => this.setState({ order }))
      .catch(() => {});
  };

  getStepCurrent(status) {
    const index = STATUS_SEQUENCE.indexOf(status);
    return index !== -1 ? index : 0;
  }

  render() {
    const { navigate } = this.props;
    const { order, loading } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!order) return <Text type="danger">Order not found</Text>;

    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        <div
          onClick={() => navigate("/orders")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            cursor: "pointer",
            color: "#8c8c8c",
            fontSize: 14,
          }}
        >
          <span>&larr;</span> Back to My Orders
        </div>

        <Title
          level={2}
          style={{ marginTop: 0, marginBottom: 24, fontWeight: 800 }}
        >
          Order #{order.orderId}
        </Title>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: 180,
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 24,
            boxShadow: "0 10px 30px rgba(30, 39, 97, 0.08)",
          }}
        >
          {order.vehicle === "DRONE" ? (
            <>
              <img
                src="/RD.png"
                alt="Drone delivery"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 55%",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(30,39,97,0.55), rgba(20,26,71,0.25))",
                }}
              />
            </>
          ) : (
            <RobotHeroBanner style={{ display: "block" }} />
          )}
          <div style={{ position: "absolute", left: 20, bottom: 16, color: "#ffffff" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              {order.vehicle === "DRONE" ? "Drone Delivery" : "Ground Robot Delivery"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {statusLabel(order.status)}
            </div>
          </div>
        </div>

        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              border: "1px solid #f0f0f0",
            }}
            bodyStyle={{ padding: "8px 0" }}
          >
            <Descriptions
              bordered
              column={1}
              labelStyle={{
                width: "200px",
                backgroundColor: "#fafafa",
                fontWeight: 600,
                color: "#434343",
                padding: "16px 24px",
              }}
              contentStyle={{
                backgroundColor: "#ffffff",
                color: "#1f1f1f",
                padding: "16px 24px",
              }}
              style={{ overflow: "hidden", borderRadius: 16 }}
            >
              <Descriptions.Item label="Destination">
                <span style={iconChipStyle}>📍</span> {order.destination}
              </Descriptions.Item>
              <Descriptions.Item label="Weight">
                {order.packageWeightLbs} lb
              </Descriptions.Item>
              <Descriptions.Item label="Transport">
                <span style={iconChipStyle}>
                  {order.vehicle === "DRONE" ? "🛸" : "🤖"}
                </span>{" "}
                {modeLabel(order.vehicle)}
              </Descriptions.Item>
              <Descriptions.Item label="Station">
                <span style={iconChipStyle}>🏢</span> Station #{order.stationId}
              </Descriptions.Item>
              <Descriptions.Item label="Price">
                <Text strong style={{ color: "#1f1f1f", fontSize: 15 }}>
                  {order.price != null ? "$" + order.price : "—"}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              border: "1px solid #f0f0f0",
              padding: "12px 8px",
            }}
          >
            <Steps
              current={this.getStepCurrent(order.status)}
              status={order.status === "DELIVERED" ? "finish" : "process"}
              items={STATUS_SEQUENCE.map((s) => ({ title: statusLabel(s) }))}
            />
          </Card>
        </Space>
      </div>
    );
  }
}

export default OrderDetailPage;
