import React from 'react';
import { Empty } from 'antd';
import { colors } from '../theme';

// Stub for MVP — see Decision 5 in the Page Inventory doc.
class SettingsPage extends React.Component {
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
          Settings
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 16,
            padding: '48px 24px',
          }}
        >
          <Empty description="Account and notification settings are a later-phase feature — stub for now." />
        </div>
      </div>
    );
  }
}

export default SettingsPage;
