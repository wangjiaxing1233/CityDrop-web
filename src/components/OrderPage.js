import React from "react";
import {
  Steps,
  Form,
  Input,
  Radio,
  Button,
  Checkbox,
  Descriptions,
  InputNumber,
  Row,
  Col,
  Tag,
  Result,
  Typography,
  Popconfirm,
  Tooltip,
  message,
} from "antd";
import {
  getDeliveryOptions,
  placeOrder,
  cancelOrder,
  QuoteExpiredError,
} from "../utils";
import { modeLabel, isCancellable, parseAddress } from "../orderUtils";
import { colors } from "../theme";
import { RobotFace } from "./VehicleArt";

const { Text } = Typography;

function formatDeadline(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Small pill so the drop-off deadline reads as a distinct, glanceable fact
// instead of getting lost in a sentence — this is the one number in the
// whole confirmation that the user actually needs to act on.
function DeadlineHighlight({ timestamp }) {
  return (
    <Text
      strong
      style={{
        color: colors.gold,
        background: "#fdf3e3",
        padding: "1px 8px",
        borderRadius: 999,
      }}
    >
      {formatDeadline(timestamp)}
    </Text>
  );
}

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
    quoteExpiresAt: null,
    now: Date.now(),
    allowQueue: false,
    placedOrder: null,
    placedStationName: null,
    cancellingPlacedOrder: false,
  };

  componentWillUnmount() {
    this.stopQuoteCountdown();
  }

  startQuoteCountdown = () => {
    this.stopQuoteCountdown();
    this.countdownTimer = setInterval(() => {
      this.setState({ now: Date.now() });
    }, 1000);
  };

  stopQuoteCountdown = () => {
    clearInterval(this.countdownTimer);
  };

  isQuoteExpired = () => {
    const { quoteExpiresAt, now } = this.state;
    return quoteExpiresAt != null && now >= quoteExpiresAt;
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
      this.setState({
        address,
        options,
        step: 1,
        selectedKey: null,
        quoteExpiresAt: options[0]?.expiresAt ?? null,
        now: Date.now(),
      });
      this.startQuoteCountdown();
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ quoting: false });
    }
  };

  handleConfirm = async () => {
    const { address, options, selectedKey, allowQueue } = this.state;
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
        quoteId: selected.quoteId,
        allowQueue,
      });
      this.setState({ placedOrder: order, placedStationName: selected.stationName });
    } catch (err) {
      if (err instanceof QuoteExpiredError) {
        message.error(err.message);
        this.backToForm();
      } else {
        message.error(err.message);
      }
    } finally {
      this.setState({ confirming: false });
    }
  };

  handleCancelPlacedOrder = () => {
    const { placedOrder } = this.state;
    this.setState({ cancellingPlacedOrder: true });
    cancelOrder(placedOrder.orderId)
      .then((updated) => {
        message.success(
          updated.refundEligible
            ? "Order cancelled — you're eligible for a refund."
            : "Order cancelled — this order was too far along to be refund-eligible.",
        );
        this.props.navigate("/orders");
      })
      .catch((err) => {
        message.error(err.message);
        this.setState({ cancellingPlacedOrder: false });
      });
  };

  // Ref to the antd Form instance so the paste-a-full-address shortcut can
  // fill the street/city/state/zip fields below without those fields
  // needing to know this shortcut exists.
  formRef = React.createRef();

  // Ref to the paste box itself (it's uncontrolled -- not part of the antd
  // Form, just a convenience shortcut) so a successful parse can clear it.
  pasteInputRef = React.createRef();

  applyParsedAddress = (text) => {
    const parsed = parseAddress(text);
    if (!parsed) return;
    this.formRef.current?.setFieldsValue({
      street: parsed.street,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
    });
    message.success("Address auto-filled from paste.");
    // Clear the box right after a successful parse -- onBlur fires again
    // for the same leftover text whenever focus leaves this field for any
    // reason (e.g. clicking "See delivery options"), not just after a real
    // edit. An empty field makes that re-fire a no-op (parseAddress(null)
    // is falsy) without needing to remember "the last text we parsed",
    // which would otherwise keep blocking a genuine re-paste of the same
    // address later (e.g. after switching accounts).
    if (this.pasteInputRef.current) {
      this.pasteInputRef.current.input.value = "";
    }
  };

  handleAddressPaste = (e) => {
    // Without this, the browser's own default paste action runs right after
    // this handler and re-inserts the clipboard text into the field — silently
    // undoing the clear at the end of applyParsedAddress. That leftover text
    // then re-triggers a second, surprise toast the next time this field
    // blurs, however much later that happens to be.
    e.preventDefault();
    // Read straight from the clipboard event — the input's own value hasn't
    // updated to the pasted text yet at paste-time.
    const text = e.clipboardData.getData("text");
    this.applyParsedAddress(text);
  };

  handleAddressBlur = (e) => {
    this.applyParsedAddress(e.target.value);
  };

  backToForm = () => {
    this.stopQuoteCountdown();
    this.setState({
      options: [],
      address: null,
      step: 0,
      quoteExpiresAt: null,
      allowQueue: false,
    });
  };

  // Leaves the form's own fields alone (street/city/state/zip, and the
  // weight) -- placing several orders in a row against the same address is
  // the common case (e.g. filling a station's queue for a demo), so keeping
  // them pre-filled saves re-typing. Only the confirmation screen and the
  // delivery-options step need clearing to get back to a fresh "create new
  // order" view.
  startNewOrder = () => {
    this.stopQuoteCountdown();
    this.setState({
      step: 0,
      options: [],
      quoting: false,
      confirming: false,
      selectedKey: null,
      quoteExpiresAt: null,
      now: Date.now(),
      allowQueue: false,
      placedOrder: null,
      placedStationName: null,
      cancellingPlacedOrder: false,
    });
  };

  render() {
    const { navigate } = this.props;
    const {
      step,
      options,
      quoting,
      confirming,
      selectedKey,
      quoteExpiresAt,
      now,
      allowQueue,
      placedOrder,
      placedStationName,
      cancellingPlacedOrder,
    } = this.state;

    // Placing an order used to redirect straight to the home page with just
    // a toast — easy to miss, and it gave no chance to surface the drop-off
    // deadline (see utils.js DROPOFF_WINDOW_MS: the vehicle is reserved the
    // moment the order is confirmed, so a no-show would hold it forever
    // without one). This screen replaces that toast-and-redirect.
    if (placedOrder) {
      const isQueued = placedOrder.status === "QUEUED";
      return (
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 12px" }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "36px 40px",
              boxShadow: "0 10px 30px rgba(30, 39, 97, 0.04)",
              border: "1px solid #e2e8f0",
            }}
          >
            <Result
              status="success"
              title={
                isQueued
                  ? "Order #" + placedOrder.orderId + " is queued"
                  : "Order #" + placedOrder.orderId + " confirmed"
              }
              subTitle={
                isQueued ? (
                  "No " +
                  modeLabel(placedOrder.vehicle).toLowerCase() +
                  " is free at " +
                  placedStationName +
                  " right now — you're in line, first come first served. " +
                  "You'll get a drop-off deadline as soon as one frees up."
                ) : placedOrder.dropoffDeadline != null ? (
                  <span>
                    Please drop off your package at {placedStationName} before{" "}
                    <DeadlineHighlight timestamp={placedOrder.dropoffDeadline} />.
                    If it's not there in time, the order is automatically
                    cancelled and the reserved{" "}
                    {modeLabel(placedOrder.vehicle).toLowerCase()} is released.
                  </span>
                ) : (
                  <span>
                    Please drop off your package at {placedStationName} to begin{" "}
                    {modeLabel(placedOrder.vehicle).toLowerCase()} delivery.
                  </span>
                )
              }
              extra={
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: 14,
                    }}
                  >
                    <Button
                      type="primary"
                      onClick={() => {
                        // This screen (still on /order) shouldn't linger in
                        // history once you leave it — replace it with
                        // /orders first so the detail page's "Back to My
                        // Orders" lands on the order list, not back on this
                        // confirmation (or the form behind it).
                        navigate("/orders", { replace: true });
                        navigate("/orders/" + placedOrder.orderId);
                      }}
                      style={{ backgroundColor: colors.navy, border: "none" }}
                    >
                      Track this order
                    </Button>
                    <Button onClick={this.startNewOrder}>
                      Place another order
                    </Button>
                    <Button onClick={() => navigate("/")}>
                      Back to Home
                    </Button>
                  </div>
                  {isCancellable(placedOrder.status) && (
                    <Popconfirm
                      title="Cancel this order?"
                      description="This can't be undone."
                      okText="Yes, cancel it"
                      cancelText="Keep order"
                      okButtonProps={{ danger: true }}
                      onConfirm={this.handleCancelPlacedOrder}
                    >
                      <Button type="text" danger loading={cancellingPlacedOrder}>
                        Cancel order
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              }
            />
          </div>
        </div>
      );
    }

    const stations = groupByStation(options);
    const selected = options.find((o) => optionKey(o) === selectedKey);
    const cheapestPrice = options.length
      ? Math.min(...options.map((o) => o.price))
      : null;
    const quoteExpired = this.isQuoteExpired();
    const secondsLeft =
      quoteExpiresAt != null
        ? Math.max(0, Math.ceil((quoteExpiresAt - now) / 1000))
        : null;
    const countdownText =
      secondsLeft != null
        ? Math.floor(secondsLeft / 60) +
          ":" +
          String(secondsLeft % 60).padStart(2, "0")
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
              ref={this.formRef}
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
                label={
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#334155",
                      fontSize: "14px",
                    }}
                  >
                    Paste full address{" "}
                    <span style={{ fontWeight: 400, color: "#94a3b8" }}>
                      (optional — auto-fills the fields below)
                    </span>
                  </span>
                }
              >
                <Input
                  ref={this.pasteInputRef}
                  placeholder="e.g. 1000 The Embarcadero, San Francisco, CA 94133"
                  onPaste={this.handleAddressPaste}
                  onBlur={this.handleAddressBlur}
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: "1px dashed #cbd5e1",
                  }}
                />
              </Form.Item>

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

              {countdownText && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: "10px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: quoteExpired ? "#cf1322" : "#475569",
                    background: quoteExpired ? "#fff1f0" : "#f1f5f9",
                    border: quoteExpired
                      ? "1px solid #ffa39e"
                      : "1px solid #e2e8f0",
                  }}
                >
                  {quoteExpired
                    ? "These prices have expired — go back and request delivery options again."
                    : "These prices are locked in for " +
                      countdownText +
                      " — after that, request delivery options again."}
                </div>
              )}

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
                              {!option.available && (
                                <Tag
                                  color="default"
                                  style={{
                                    margin: 0,
                                    borderRadius: 999,
                                    fontSize: 11,
                                    lineHeight: "16px",
                                    padding: "0 8px",
                                  }}
                                >
                                  Sold out
                                </Tag>
                              )}
                              {option.recommended && (
                                <Tooltip title={option.recommendationReason}>
                                  <Tag
                                    color="blue"
                                    style={{
                                      margin: 0,
                                      borderRadius: 999,
                                      fontSize: 11,
                                      lineHeight: "16px",
                                      padding: "0 8px",
                                    }}
                                  >
                                    Recommended for you
                                  </Tag>
                                </Tooltip>
                              )}
                              {option.available && option.highDemand && (
                                <Tag
                                  color="volcano"
                                  style={{
                                    margin: 0,
                                    borderRadius: 999,
                                    fontSize: 11,
                                    lineHeight: "16px",
                                    padding: "0 8px",
                                  }}
                                >
                                  High demand
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

              {selected && !selected.available && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: "12px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "#fffbe6",
                    border: "1px solid #ffe58f",
                  }}
                >
                  <div style={{ marginBottom: 8, color: "#874d00" }}>
                    This option is sold out right now — no{" "}
                    {selected.mode === "DRONE" ? "drones" : "ground robots"} left
                    at {selected.stationName}.
                  </div>
                  <Checkbox
                    checked={allowQueue}
                    onChange={(e) =>
                      this.setState({ allowQueue: e.target.checked })
                    }
                  >
                    Join the queue — assign me the next one that frees up, at
                    today's price
                  </Checkbox>
                </div>
              )}

              <Button
                type="primary"
                onClick={this.handleConfirm}
                loading={confirming}
                disabled={
                  !selected ||
                  quoteExpired ||
                  (!selected.available && !allowQueue)
                }
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
