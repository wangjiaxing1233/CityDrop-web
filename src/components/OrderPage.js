import React from 'react';
import { Steps, Form, Input, Checkbox, Button, Descriptions, InputNumber, message } from 'antd';
import { getQuote, placeOrder } from '../utils';
import { transportLabel } from '../orderUtils';

// Two steps (order form -> quote), both on this one class component's
// state — matching Decision 2 in the Page Inventory doc, just without
// useState: step/formValues/quote/quoting/confirming are all fields on
// this.state instead of separate useState() calls.
class OrderPage extends React.Component {
  state = {
    step: 0,
    formValues: null, // the fields to resend on confirm
    quote: null, // the server's quote response
    quoting: false,
    confirming: false,
  };

  handleFormFinish = async (values) => {
    const payload = {
      destination: values.destination,
      weightLb: values.weight,
      preferStation: !!values.prefStation,
      preferSpeed: !!values.prefSpeed,
      preferPrice: !!values.prefPrice,
    };
    this.setState({ quoting: true });
    try {
      const q = await getQuote(payload);
      this.setState({ formValues: payload, quote: q, step: 1 });
    } catch (err) {
      // Covers both "backend not reachable yet" and the 409 "not enough
      // vehicles" case — either way, err.message is already the right
      // human-readable string (see utils.js's readError()).
      message.error(err.message);
    } finally {
      this.setState({ quoting: false });
    }
  };

  handleConfirm = async () => {
    if (!this.state.formValues) return;
    this.setState({ confirming: true });
    try {
      const order = await placeOrder(this.state.formValues);
      message.success('Order #' + order.id + ' placed. Track it from My Orders.');
      this.props.navigate('home');
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({ confirming: false });
    }
  };

  backToForm = () => {
    this.setState({ quote: null, formValues: null, step: 0 });
  };

  render() {
    const { navigate } = this.props;
    const { step, quote, quoting, confirming } = this.state;

    return (
      <div>
        <a onClick={() => navigate('home')} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
          &larr; Back to Home
        </a>

        <Steps
          current={step}
          items={[{ title: 'Order Info' }, { title: 'Delivery Plan' }]}
          style={{ marginBottom: 24 }}
        />

        {step === 0 && (
          <Form
            layout="vertical"
            onFinish={this.handleFormFinish}
            initialValues={{ destination: '88 Mission St, San Francisco', weight: 3 }}
          >
            <Form.Item name="destination" label="Delivery destination" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="weight" label="Package weight (lb)" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="prefStation" valuePropName="checked">
              <Checkbox>Specify distribution station</Checkbox>
            </Form.Item>
            <Form.Item name="prefSpeed" valuePropName="checked">
              <Checkbox>Prioritize speed (Drone)</Checkbox>
            </Form.Item>
            <Form.Item name="prefPrice" valuePropName="checked">
              <Checkbox>Prioritize low price (Ground Robot)</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={quoting}>
              Get price &amp; plan
            </Button>
          </Form>
        )}

        {step === 1 && quote && (
          <div>
            <a onClick={this.backToForm} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
              &larr; Back to edit order
            </a>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Destination">{quote.destination}</Descriptions.Item>
              <Descriptions.Item label="Package weight">{quote.weightLb} lb</Descriptions.Item>
              <Descriptions.Item label="Transport method">{transportLabel(quote.transport)}</Descriptions.Item>
              <Descriptions.Item label="Estimated time">{quote.etaText}</Descriptions.Item>
              <Descriptions.Item label="Nearest station">
                {quote.station}
                {quote.stationAutoAssigned ? ' (auto-assigned)' : ' (per your preference)'}
              </Descriptions.Item>
              <Descriptions.Item label="Price">${quote.price}</Descriptions.Item>
            </Descriptions>
            <Button type="primary" onClick={this.handleConfirm} loading={confirming} style={{ marginRight: 12 }}>
              Confirm Order
            </Button>
            <Button onClick={this.backToForm} disabled={confirming}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }
}

export default OrderPage;
