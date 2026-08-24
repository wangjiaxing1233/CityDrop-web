import React from "react";
import {
  Empty,
  Button,
  Typography,
  Tag,
  Spin,
  message,
  Tabs,
  Card,
  Space,
} from "antd";
import { getOrders } from "../utils";
import { statusLabel } from "../orderUtils";
import { colors } from "../theme";
import { RobotHeroBanner } from "./VehicleArt";

const { Title, Text } = Typography;

class MyOrdersPage extends React.Component {
  state = {
    active: [],
    completed: [],
    loading: true,
  };

  componentDidMount() {
    this.load();
    // Order status moves on its own (mock ticker or, later, real dispatch
    // updates) — nothing pushes that to the browser, so we poll instead of
    // only reading once on mount.
    this.pollTimer = setInterval(this.refresh, 4000);
  }

  componentWillUnmount() {
    clearInterval(this.pollTimer);
  }

  load = () => {
    this.setState({ loading: true });
    getOrders()
      .then(({ active, completed }) =>
        this.setState({ active, completed, loading: false }),
      )
      .catch((err) => {
        message.error(err.message);
        this.setState({ loading: false });
      });
  };

  // Same fetch as load(), but silent — no loading spinner, no error toast,
  // since this runs in the background every few seconds.
  refresh = () => {
    getOrders()
      .then(({ active, completed }) => this.setState({ active, completed }))
      .catch(() => {});
  };

  badge(o) {
    if (o.status === "DELIVERED")
      return (
        <Tag
          color="success"
          style={{ borderRadius: 12, padding: "2px 10px", margin: 0 }}
        >
          Delivered
        </Tag>
      );
    if (o.status === "CANCELLED")
      return (
        <Tag
          color="default"
          style={{ borderRadius: 12, padding: "2px 10px", margin: 0 }}
        >
          Cancelled
        </Tag>
      );
    if (o.status === "QUEUED")
      return (
        <Tag
          color="gold"
          style={{ borderRadius: 12, padding: "2px 10px", margin: 0 }}
        >
          Queued
        </Tag>
      );
    return (
      <Tag
        color="processing"
        style={{ borderRadius: 12, padding: "2px 10px", margin: 0 }}
      >
        {statusLabel(o.status)}
      </Tag>
    );
  }

  renderList(list) {
    const { navigate } = this.props;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {list.map((o) => (
          <Card
            key={o.orderId}
            hoverable
            onClick={() => navigate("/orders/" + o.orderId)}
            bodyStyle={{ padding: "24px" }}
            cover={
              <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
                {o.vehicle === "DRONE" ? (
                  <>
                    <img
                      src="/RD.png"
                      alt="Drone delivery"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 30%",
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
              </div>
            }
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 14px rgba(30, 39, 97, 0.06)",
              border: "1px solid #f0f0f0",
              borderLeft: `4px solid ${
                o.status === "DELIVERED"
                  ? "#22c55e"
                  : o.status === "CANCELLED"
                    ? "#bfbfbf"
                    : o.status === "QUEUED"
                      ? "#faad14"
                      : colors.navy
              }`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <Space direction="vertical" size={2}>
                <Space size={6}>
                  <span style={{ fontSize: 15 }}>
                    {o.vehicle === "DRONE" ? "🛸" : "🤖"}
                  </span>
                  <Text strong style={{ fontSize: 17, color: "#1f1f1f" }}>
                    #{o.orderId}
                  </Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {o.status === "QUEUED"
                    ? o.estimatedWaitMs != null
                      ? "Estimated wait: ~" +
                        Math.max(1, Math.round(o.estimatedWaitMs / 60000)) +
                        " min"
                      : "Estimated wait: unknown"
                    : o.time != null
                      ? "Estimated Delivery: " +
                        Math.round(o.time * 10) / 10 +
                        " min" +
                        (o.timeIsFallback ? " (estimated)" : "")
                      : "Estimated Delivery"}
                </Text>
              </Space>
              {this.badge(o)}
            </div>

            <div
              style={{
                padding: "14px 0",
                borderTop: "1px dashed #f0f0f0",
                borderBottom: "1px dashed #f0f0f0",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#434343",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>📍</span> {o.destination}
              </Text>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text type="secondary" style={{ fontSize: 13 }}>
                Total Paid
              </Text>
              <Text strong style={{ fontSize: 19, color: "#1f1f1f" }}>
                {o.price != null ? "$" + o.price : "—"}
              </Text>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  render() {
    const { navigate, activeTab, setActiveTab } = this.props;
    const { active, completed, loading } = this.state;
    const orders = active.length + completed.length;

    return (
      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          onClick={() => navigate("/")}
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
          <span>&larr;</span> Back to Home
        </div>

        <Title
          level={2}
          style={{ marginTop: 0, marginBottom: 24, fontWeight: 800 }}
        >
          My Orders
        </Title>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Spin size="large" />
          </div>
        ) : orders === 0 ? (
          <Card
            style={{
              borderRadius: 16,
              textAlign: "center",
              padding: "40px 0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            }}
          >
            <Empty
              description={
                <Text type="secondary">
                  No orders yet — place one to see it show up here.
                </Text>
              }
            >
              <Button
                type="primary"
                size="large"
                shape="round"
                onClick={() => navigate("/order")}
                style={{ paddingLeft: 24, paddingRight: 24 }}
              >
                Place an order
              </Button>
            </Empty>
          </Card>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
            items={[
              {
                key: "1",
                label: `Active (${active.length})`,
                children: active.length ? (
                  this.renderList(active)
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No active orders right now."
                    />
                  </div>
                ),
              },
              {
                key: "2",
                label: `Completed (${completed.length})`,
                children: completed.length ? (
                  this.renderList(completed)
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No completed orders yet."
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    );
  }
}

export default MyOrdersPage;
