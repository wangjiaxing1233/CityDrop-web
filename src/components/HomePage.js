import React from 'react';
import { Card, Row, Col } from 'antd';
import { colors } from '../theme';

const tiles = [
  { label: 'Query', page: 'order', icon: '🔍' },
  { label: 'New Order', page: 'order', icon: '📦' },
  { label: 'My Orders', page: 'myOrders', icon: '📋' },
  { label: 'Support', page: 'support', icon: '🎧' },
  { label: 'Settings', page: 'settings', icon: '⚙️' },
];

// A plain function-less class component — no internal state at all here,
// it just reads props (`user`, `navigate`) that App.js passed down.
class HomePage extends React.Component {
  render() {
    const { user, navigate } = this.props;
    return (
      <div>
        <h2 style={{ color: colors.navy, marginTop: 0 }}>Welcome back, {user}</h2>
        <p style={{ color: colors.muted, marginTop: -12 }}>What would you like to send today?</p>

        <div
          style={{
            background: colors.iceBg,
            borderRadius: 12,
            height: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.navy,
            marginBottom: 24,
          }}
        >
          Same-city ground robot / drone delivery &middot; San Francisco
        </div>

        <Row gutter={16} justify="center">
          {tiles.map((t) => (
            <Col span={4} key={t.label}>
              <Card hoverable style={{ textAlign: 'center' }} onClick={() => navigate(t.page)}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ color: colors.text, fontSize: 13 }}>{t.label}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }
}

export default HomePage;
