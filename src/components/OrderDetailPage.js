import React from "react";
import {
  Typography,
  Card,
  Steps,
  Descriptions,
  Space,
  Spin,
  message,
  Button,
  Popconfirm,
  Tag,
} from "antd";
import { getOrder, confirmAtStation, cancelOrder } from "../utils";
import {
  modeLabel,
  statusLabel,
  STATUS_SEQUENCE,
  isCancellable,
} from "../orderUtils";
import { RobotHeroBanner } from "./VehicleArt";
import { TrackingMap } from "./TrackingMap";

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
    confirming: false,
    cancelling: false,
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
  // once the order is in a terminal state (delivered or cancelled) since
  // the status can't move further either way.
  refresh = () => {
    const { orderId } = this.props;
    if (this.state.order && !isCancellable(this.state.order.status)) {
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

  // CANCELLED and QUEUED both sit outside STATUS_SEQUENCE (see orderUtils),
  // so neither one has a sane position on the Steps progress bar — each
  // gets its own explanatory card instead.
  renderProgressCard(order, confirming) {
    if (order.status === "CANCELLED") {
      return (
        <Card
          variant="borderless"
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            border: "1px solid #f0f0f0",
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          <Text type="secondary">
            {order.missedDropoff
              ? "This order was automatically cancelled — the package wasn't dropped off at the station in time."
              : "This order was cancelled and will not be delivered."}
          </Text>
        </Card>
      );
    }

    // PENDING_DROPOFF is a text card, not the map — nothing has moved yet
    // (the package is still with the user, not the vehicle), so a "station
    // -> destination" route with the vehicle icon parked at the station
    // start would just be showing a leg that hasn't started, not the leg
    // the user is actually on. There's no real-time-tracking data source
    // (or design-doc requirement) for their own trip to the station either.
    if (order.status === "PENDING_DROPOFF") {
      return (
        <Card
          variant="borderless"
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            border: "1px solid #f0f0f0",
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          <Text type="secondary">
            Drop your package off at Station #{order.stationId} to start the{" "}
            {modeLabel(order.vehicle).toLowerCase()} delivery.
          </Text>
          {order.dropoffDeadline != null && (
            <div style={{ marginTop: 10 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Drop off by{" "}
                <Text
                  strong
                  style={{
                    color: "#E8A33D",
                    background: "#fdf3e3",
                    padding: "1px 8px",
                    borderRadius: 999,
                  }}
                >
                  {new Date(order.dropoffDeadline).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>{" "}
                — after that the order is automatically cancelled and the
                vehicle is released.
              </Text>
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Button
              type="primary"
              shape="round"
              size="large"
              loading={confirming}
              onClick={this.handleConfirmAtStation}
              style={{ paddingLeft: 24, paddingRight: 24 }}
            >
              I've dropped off my package at the station
            </Button>
          </div>
        </Card>
      );
    }

    if (order.status === "QUEUED") {
      return (
        <Card
          variant="borderless"
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            border: "1px solid #f0f0f0",
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          <Text type="secondary">
            Waiting for a {modeLabel(order.vehicle).toLowerCase()} to free up
            at Station #{order.stationId} — you're in line, first come first
            served. This won't move until one becomes available.
          </Text>
          <div style={{ marginTop: 10 }}>
            {order.estimatedWaitMs != null ? (
              <Text
                strong
                style={{
                  color: "#E8A33D",
                  background: "#fdf3e3",
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 13,
                }}
              >
                Estimated wait: ~
                {Math.max(1, Math.round(order.estimatedWaitMs / 60000))} min
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Wait time depends on how quickly the orders ahead of you get
                dropped off — no estimate yet.
              </Text>
            )}
          </div>
        </Card>
      );
    }

    return (
      <Card
        variant="borderless"
        style={{
          borderRadius: 16,
          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
          border: "1px solid #f0f0f0",
          padding: "12px 8px",
        }}
      >
        <div style={{ padding: "0 8px 20px" }}>
          <TrackingMap
            progress={
              this.getStepCurrent(order.status) / (STATUS_SEQUENCE.length - 1)
            }
            vehicle={order.vehicle}
            destination={order.destination}
            stationId={order.stationId}
          />
        </div>
        <Steps
          current={this.getStepCurrent(order.status)}
          status={order.status === "DELIVERED" ? "finish" : "process"}
          items={STATUS_SEQUENCE.map((s) => ({ title: statusLabel(s) }))}
        />
      </Card>
    );
  }

  // PENDING_DROPOFF is the one stage that waits on the user instead of the
  // poll ticker — they physically dropped the package at the station, so
  // they're the ones who know it happened.
  handleConfirmAtStation = () => {
    const { order } = this.state;
    this.setState({ confirming: true });
    confirmAtStation(order.orderId)
      .then((updated) => {
        this.setState({ order: updated, confirming: false });
        if (updated.status === "QUEUED") {
          message.info(
            "No vehicle was free when you arrived — you've been added to " +
              "the queue and will get a new drop-off deadline once one " +
              "frees up.",
          );
        }
      })
      .catch((err) => {
        message.error(err.message);
        this.setState({ confirming: false });
      });
  };

  handleCancelOrder = () => {
    const { order } = this.state;
    this.setState({ cancelling: true });
    cancelOrder(order.orderId)
      .then((updated) => {
        this.setState({ order: updated, cancelling: false });
        message.success(
          updated.refundEligible
            ? "Order cancelled — you're eligible for a refund."
            : "Order cancelled — this order was too far along to be refund-eligible.",
        );
      })
      .catch((err) => {
        message.error(err.message);
        this.setState({ cancelling: false });
      });
  };

  render() {
    const { navigate } = this.props;
    const { order, loading, confirming, cancelling } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!order) return <Text type="danger">Order not found</Text>;

    return (
      <div
        style={{
          width: "92%",
          maxWidth: 1800,
          margin: "0 auto",
          padding: "24px 16px",
        }}
      >
        <div
          onClick={() => navigate(-1)}
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
          {order.status === "CANCELLED" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(20, 20, 20, 0.55)",
              }}
            />
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
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color:
                  order.status === "CANCELLED"
                    ? "#ff4d4f"
                    : order.status === "QUEUED"
                      ? "#faad14"
                      : "#ffffff",
              }}
            >
              {statusLabel(order.status)}
            </div>
          </div>
        </div>

        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              border: "1px solid #f0f0f0",
            }}
            styles={{ body: { padding: "8px 0" } }}
          >
            <Descriptions
              bordered
              column={1}
              styles={{
                label: {
                  width: "200px",
                  backgroundColor: "#fafafa",
                  fontWeight: 600,
                  color: "#434343",
                  padding: "16px 24px",
                },
                content: {
                  backgroundColor: "#ffffff",
                  color: "#1f1f1f",
                  padding: "16px 24px",
                },
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
              {order.time != null && (
                <Descriptions.Item label="Estimated time">
                  {Math.round(order.time * 10) / 10} min
                  {order.timeIsFallback && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {" "}
                      (estimated — mapping service was unavailable)
                    </Text>
                  )}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Price">
                <Text strong style={{ color: "#1f1f1f", fontSize: 15 }}>
                  {order.price != null ? "$" + order.price : "—"}
                </Text>
              </Descriptions.Item>
              {order.status === "CANCELLED" && order.refundEligible != null && (
                // The real backend's plain GET /order/{id} doesn't carry
                // refundEligible -- only the cancel response itself does
                // (see cancelOrderReal in utils.js). So this only renders
                // right after cancelling in this session; reloading the page
                // for an already-cancelled order just omits the row instead
                // of guessing (undefined would otherwise read as "false" and
                // assert "Not eligible", which may not be true).
                <Descriptions.Item label="Refund">
                  <Tag color={order.refundEligible ? "success" : "default"}>
                    {order.refundEligible ? "Eligible" : "Not eligible"}
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {isCancellable(order.status) && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Popconfirm
                title="Cancel this order?"
                description="This can't be undone."
                okText="Yes, cancel it"
                cancelText="Keep order"
                okButtonProps={{ danger: true }}
                onConfirm={this.handleCancelOrder}
              >
                <Button danger loading={cancelling}>
                  Cancel order
                </Button>
              </Popconfirm>
            </div>
          )}

          {this.renderProgressCard(order, confirming)}
        </Space>
      </div>
    );
  }
}

export default OrderDetailPage;
