import React from 'react';
import { Empty } from 'antd';
import { colors } from '../theme';

// Intentionally a stub for MVP — see Decision 5 in the Page Inventory doc.
// No API calls, no state — this is why it has no arrows out in the
// architecture diagram slide.
class SupportPage extends React.Component {
  render() {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <a
          onClick={() => this.props.navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 28,
            cursor: 'pointer',
            fontWeight: 600,
            color: '#4b5563',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>&larr;</span> Back to Home
        </a>
        <h2
          style={{
            marginTop: 0,
            color: colors.navy,
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 24,
          }}
        >
          Support
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 16,
            padding: '48px 24px',
          }}
        >
          <Empty description="Customer support is a later-phase feature — stub for now." />
        </div>
      </div>
    );
  }
}

export default SupportPage;
