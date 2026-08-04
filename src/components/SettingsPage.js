import React from 'react';
import { Empty } from 'antd';

// Stub for MVP — see Decision 5 in the Page Inventory doc.
class SettingsPage extends React.Component {
  render() {
    return (
      <div>
        <a onClick={() => this.props.navigate('home')} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
          &larr; Back to Home
        </a>
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <Empty description="Account and notification settings are a later-phase feature — stub for now." />
      </div>
    );
  }
}

export default SettingsPage;
