import React from 'react';
import { Empty, Button, Typography, Tag, List, Spin, message } from 'antd';
import { getOrders } from '../utils';
import { statusLabel, isActive, isCompleted } from '../orderUtils';

const { Title } = Typography;

// Fetches GET /api/orders once when this page mounts — the class-component
// equivalent of citydrop-web's `useEffect(() => { refreshOrders() }, [])`.
class MyOrdersPage extends React.Component {
  state = {
    orders: [],
    loading: true,
  };

  componentDidMount() {
    this.load();
  }

  load = () => {
    this.setState({ loading: true });
    getOrders()
      .then((orders) => this.setState({ orders, loading: false }))
      .catch((err) => {
        message.error(err.message);
        this.setState({ loading: false });
      });
  };

  badge(o) {
    if (o.status === 'CANCELLED') return <Tag color="volcano">Cancelled</Tag>;
    if (o.status === 'DELIVERED') return <Tag color="green">Delivered</Tag>;
    return <Tag color="blue">{statusLabel(o.status)}</Tag>;
  }

  renderList(list) {
    const { navigate } = this.props;
    return (
      <List
        dataSource={list}
        renderItem={(o) => (
          <List.Item onClick={() => navigate('orderDetail', { orderId: o.id })} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>#{o.id}</div>
                <div style={{ fontSize: 12.5, color: '#6b6b6b' }}>
                  {o.destination} &middot; {o.price != null ? '$' + o.price : ''}
                </div>
              </div>
              {this.badge(o)}
            </div>
          </List.Item>
        )}
      />
    );
  }

  render() {
    const { navigate } = this.props;
    const { orders, loading } = this.state;
    const active = orders.filter(isActive);
    const completed = orders.filter(isCompleted);

    return (
      <div>
        <a onClick={() => navigate('home')} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
          &larr; Back to Home
        </a>
        <Title level={3} style={{ marginTop: 0 }}>
          My Orders
        </Title>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin />
          </div>
        ) : orders.length === 0 ? (
          <Empty description="No orders yet — place one to see it show up here.">
            <Button type="primary" onClick={() => navigate('order')}>
              Place an order
            </Button>
          </Empty>
        ) : (
          <div>
            <Title level={5}>Active ({active.length})</Title>
            {active.length ? this.renderList(active) : <p style={{ color: '#6b6b6b' }}>No active orders right now.</p>}

            <Title level={5} style={{ marginTop: 24 }}>
              Completed ({completed.length})
            </Title>
            {completed.length ? this.renderList(completed) : <p style={{ color: '#6b6b6b' }}>No completed orders yet.</p>}
          </div>
        )}
      </div>
    );
  }
}

export default MyOrdersPage;
