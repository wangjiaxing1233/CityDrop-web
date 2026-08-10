import React from "react";
import {
  Steps,
  Form,
  Input,
  Radio,
  Button,
  Descriptions,
  InputNumber,
  Row,
  Col,
  Tag,
  message,
} from "antd";
import { getDeliveryOptions, placeOrder } from "../utils";
import { modeLabel } from "../orderUtils";
import { colors } from "../theme";
import { RobotFace } from "./VehicleArt";

function groupByStation(options) {
  const stations = [];
  const byId = new Map();
  for (const option of options) {
    if (!byId.has(option.stationId)) {
      const entry = { ...option, options: [] };
      byId.set(option.stationId, entry);
      stations.push(entry);
    }
    byId.get(option.stationId).options.push(option);
  }
  return stations;
}

function optionKey(option) {
  return option.stationId + "_" + option.mode;
}

class OrderPage extends React.Component {
  state = {
    step: 0,
    address: null,
    options: [],
    quoting: false,
    confirming: false,
    selectedKey: null,
  };

  handleFormFinish = async (values) => {
    const address = {
      destStreet: values.street,
      destCity: values.city,
      destState: values.state,
      destZip: values.zip,
      weightLb: values.weight,
    };
    this.setState({ quoting: true });
    try {
      const options = await getDeliveryOptions({
        destStreet: address.destStreet,
        destCity: address.destCity,
        destState: address.destState,
        destZip: address.destZip,
        packageWeight: address.weightLb,
      });
      this.setState({ address, options, step: 1, selectedKey: null });
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ quoting: false });
    }
  };

  handleConfirm = async () => {
    const { address, options, selectedKey } = this.state;
    const selected = options.find((o) => optionKey(o) === selectedKey);
    if (!selected) {
      message.error("Please select an option");
      return;
    }
    const destination = [
      address.destStreet,
      address.destCity,
      address.destState + " " + address.destZip,
    ]
      .filter(Boolean)
      .join(", ");

    this.setState({ confirming: true });
    try {
      const order = await placeOrder({
        destination,
        packageWeightLbs: address.weightLb,
        stationId: selected.stationId,
        vehicle: selected.mode,
      });
      message.success(
        "Order #" + order.orderId + " placed. Track it from My Orders.",
      );
      this.props.navigate("/");
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ confirming: false });
    }
  };

  backToForm = () => {
    this.setState({ options: [], address: null, step: 0 });
  };

  render() {
    const { navigate } = this.props;
    const { step, options, quoting, confirming, selectedKey } = this.state;
    const stations = groupByStation(options);
    const selected = options.find((o) => optionKey(o) === selectedKey);
    const cheapestPrice = options.length
      ? Math.min(...options.map((o) => o.price))
      : null;

    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 12px" }}>
        <a
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            marginBottom: 28,
            cursor: "pointer",
            fontWeight: 600,
            color: "#4b5563",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>&larr;</span> Back to
          Home
        </a>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "36px 40px",
            boxShadow: "0 10px 30px rgba(30, 39, 97, 0.04)",
            border: "1px solid #e2e8f0",
          }}
        >
          <Steps
            current={step}
            items={[{ title: "Order Info" }, { title: "Delivery Plan" }]}
            style={{ marginBottom: 36 }}
          />

          {step === 0 && (
            <Form
              layout="vertical"
              onFinish={this.handleFormFinish}
              initialValues={{
                street: "88 Mission St",
                city: "San Francisco",
                state: "CA",
                zip: "94105",
                weight: 3,
              }}
              requiredMark={false}
            >
              <Form.Item
                name="street"
                label={
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#334155",
                      fontSize: "14px",
                    }}
                  >
                    Street address
                  </span>
                }
                rules={[
                  { required: true, message: "Please input street address" },
                ]}
              >
                <Input
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                  }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={10}>
                  <Form.Item
                    name="city"
                    label={
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#334155",
                          fontSize: "14px",
                        }}
                      >
                        City
                      </span>
                    }
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input
                      style={{
                        height: 44,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item
                    name="state"
                    label={
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#334155",
                          fontSize: "14px",
                        }}
                      >
                        State
                      </span>
                    }
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input
                      style={{
                        height: 44,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item
                    name="zip"
                    label={
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#334155",
                          fontSize: "14px",
                        }}
                      >
                        Zip
                      </span>
                    }
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input
                      style={{
                        height: 44,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="weight"
                label={
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#334155",
                      fontSize: "14px",
                    }}
                  >
                    Package weight (lb)
                  </span>
                }
                rules={[
                  { required: true, message: "Please input package weight" },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{
                    width: "100%",
                    maxWidth: 200,
                    height: 44,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    lineHeight: "42px",
                  }}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={quoting}
                style={{
                  height: 44,
                  borderRadius: 8,
                  padding: "0 32px",
                  fontWeight: 600,
                  fontSize: "14px",
                  backgroundColor: colors.navy,
                  border: "none",
                  marginTop: "12px",
                  boxShadow: "0 4px 12px rgba(26, 31, 61, 0.15)",
                }}
              >
                See delivery options
              </Button>
            </Form>
          )}
          {step === 1 && (
            <div>
              <a
                onClick={this.backToForm}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 0,
                  marginBottom: 24,
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#4b5563",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>&larr;</span> Back
                to edit order
              </a>

              <Radio.Group
                style={{ width: "100%" }}
                value={selectedKey}
                onChange={(e) => this.setState({ selectedKey: e.target.value })}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "20px",
                    marginBottom: 28,
                  }}
                >
                  {stations.map((station) => {
                    const isActiveStation = selectedKey?.startsWith(
                      station.stationId + "_",
                    );
                    return (
                      <div
                        key={station.stationId}
                        className="delivery-option-card"
                        style={{
                          border: isActiveStation
                            ? `2px solid ${colors.navy}`
                            : "1px solid #cbd5e1",
                          padding: isActiveStation ? "19px" : "20px",
                          borderRadius: "12px",
                          backgroundColor: isActiveStation
                            ? "#f8fafc"
                            : "#ffffff",
                          boxShadow: isActiveStation
                            ? "0 4px 20px rgba(26, 31, 61, 0.06)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                            color: colors.muted,
                            marginBottom: 4,
                          }}
                        >
                          Station {station.stationId}
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            marginBottom: 14,
                            fontSize: "14px",
                            color: colors.navy,
                          }}
                        >
                          {station.stationName}
                        </div>
                        {station.options.map((option) => (
                          <Radio
                            key={optionKey(option)}
                            value={optionKey(option)}
                            style={{
                              display: "block",
                              marginBottom: 12,
                              fontSize: "14px",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                verticalAlign: "middle",
                              }}
                            >
                              {option.mode === "DRONE" ? (
                                <img
                                  src="/RD.png"
                                  alt=""
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    objectFit: "cover",
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <RobotFace size={28} />
                              )}
                              {modeLabel(option.mode)} &middot; ${option.price}
                              {option.price === cheapestPrice && (
                                <Tag
                                  color="gold"
                                  style={{
                                    margin: 0,
                                    borderRadius: 999,
                                    fontSize: 11,
                                    lineHeight: "16px",
                                    padding: "0 8px",
                                  }}
                                >
                                  Best Value
                                </Tag>
                              )}
                            </span>
                          </Radio>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </Radio.Group>

              {selected && (
                <Descriptions
                  bordered
                  column={1}
                  size="middle"
                  style={{ marginBottom: 28 }}
                >
                  <Descriptions.Item
                    label={
                      <span style={{ fontWeight: 600, color: "#475569" }}>
                        Station
                      </span>
                    }
                  >
                    {selected.stationName}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <span style={{ fontWeight: 600, color: "#475569" }}>
                        Transport method
                      </span>
                    }
                  >
                    {modeLabel(selected.mode)}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <span style={{ fontWeight: 600, color: "#475569" }}>
                        Estimated time
                      </span>
                    }
                  >
                    {selected.etaText}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <span style={{ fontWeight: 600, color: "#475569" }}>
                        Price
                      </span>
                    }
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: colors.navy,
                        fontSize: "16px",
                      }}
                    >
                      ${selected.price}
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              )}

              <Button
                type="primary"
                onClick={this.handleConfirm}
                loading={confirming}
                disabled={!selected}
                style={{
                  marginRight: 16,
                  height: 44,
                  borderRadius: 8,
                  padding: "0 28px",
                  fontWeight: 600,
                  backgroundColor: colors.navy,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(26, 31, 61, 0.15)",
                }}
              >
                Confirm Order
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default OrderPage;
