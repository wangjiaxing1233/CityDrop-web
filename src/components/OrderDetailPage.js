import React from 'react';
import { Steps, Card, Button, Space, Descriptions, Tag, Empty, Spin, message, Modal } from 'antd';
import { getOrder, simulateNext, cancelOrder, confirmPickup } from '../utils';
import { transportLabel } from '../orderUtils';

const STEP_STATUSES = ['ARRIVED_AT_STATION', 'LEFT_STATION', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const STEP_TITLES = ['Arrived at station', 'Left station', 'Out for delivery', 'Delivered'];

// Gets its order id from a prop (this.props.orderId, set by App.js's
// navigate('orderDetail', { orderId })) instead of from the URL
// (useParams()) — this is the one page that most shows the trade-off of
// not using react-router-dom: there's no "/orders/A1234" address bar URL
// to refresh or copy, only in-app navigation.
class OrderDetailPage extends React.Component {
  state = {
    order: null,
    loading: true,
    busy: false,
  };

  componentDidMount() {
    this.load();
  }

  load = () => {
    this.setState({ loading: true });
    getOrder(this.props.orderId)
      .then((order) => this.setState({ order, loading: false }))
      .catch((err) => {
        message.error(err.message);
        this.setState({ order: null, loading: false });
      });
  };

  handleSimulate = () => {
    this.setState({ busy: true });
    simulateNext(this.props.orderId)
      .then((order) => this.setState({ order, busy: false }))
      .catch((err) => {
        message.error(err.message);
        this.setState({ busy: false });
      });
  };

  handleCancel = () => {
    this.setState({ busy: true });
    cancelOrder(this.props.orderId)
      .then((result) => {
        if (result.requiresPickupConfirmation) {
          Modal.confirm({
            title: 'Confirm cancellation',
            content: result.message,
            okText: 'Confirm pickup',
            cancelText: 'Never mind',
            onOk: () => {
              confirmPickup(this.props.orderId)
                .then((order) => {
                  this.setState({ order });
                  message.success('Order cancelled.');
                })
                .catch((err) => message.error(err.message));
            },
          });
        } else {
          this.setState({ order: result });
          message.success('Order cancelled.');
        }
        this.setState({ busy: false });
      })
      .catch((err) => {
        // e.g. the 409 "Delivered orders can't be cancelled" case
        message.error(err.message);
        this.setState({ busy: false });
      });
  };

  render() {
    const { navigate, orderId } = this.props;
    const { order, loading, busy } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin />
        </div>
      );
    }

    if (!order) {
      return (
        <div>
          <a onClick={() => navigate('myOrders')} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
            &larr; Back to My Orders
          </a>
          <Empty description={'Order #' + orderId + ' not found.'} />
        </div>
      );
    }

    const disabled = busy || order.status === 'CANCELLED' || order.status === 'DELIVERED';
    const stepIndex = STEP_STATUSES.indexOf(order.status); // -1 for QUEUED/PENDING_DROPOFF/CANCELLED

    return (
      <div>
        <a onClick={() => navigate('myOrders')} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
          &larr; Back to My Orders
        </a>
        <h2 style={{ marginTop: 0 }}>Order #{order.id}</h2>

        <Descriptions bordered column={1} size="small" style={{ marginBottom: 20 }}>
          <Descriptions.Item label="Destination">{order.destination}</Descriptions.Item>
          <Descriptions.Item label="Weight">{order.weightLb} lb</Descriptions.Item>
          <Descriptions.Item label="Transport">{transportLabel(order.transport)}</Descriptions.Item>
          <Descriptions.Item label="Station">{order.station}</Descriptions.Item>
          <Descriptions.Item label="Price">${order.price}</Descriptions.Item>
        </Descriptions>

        {order.status === 'CANCELLED' && (
          <Tag color="volcano" style={{ marginBottom: 16 }}>
            This order has been cancelled
          </Tag>
        )}
        {order.status === 'QUEUED' && (
          <Tag color="gold" style={{ marginBottom: 16 }}>
            Queued — waiting for an available {transportLabel(order.transport)}
          </Tag>
        )}

        <Card style={{ marginBottom: 24 }}>
          <Steps
            size="small"
            current={stepIndex}
            status={order.status === 'CANCELLED' ? 'error' : order.status === 'DELIVERED' ? 'finish' : 'process'}
            items={STEP_TITLES.map((title) => ({ title }))}
          />
        </Card>

        <Space>
          <Button disabled={disabled} loading={busy} onClick={this.handleSimulate}>
            Simulate next step
          </Button>
          <Button danger disabled={disabled} loading={busy} onClick={this.handleCancel}>
            Cancel Order
          </Button>
        </Space>
      </div>
    );
  }
}

export default OrderDetailPage;
