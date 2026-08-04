import React from 'react';
import { Empty } from 'antd';

// Intentionally a stub for MVP — see Decision 5 in the Page Inventory doc.
// No API calls, no state — this is why it has no arrows out in the
// architecture diagram slide.
class SupportPage extends React.Component {
  render() {
    return (
      <div>
        <a onClick={() => this.props.navigate('home')} style={{ display: 'inline-block', marginBottom: 16, cursor: 'pointer' }}>
          &larr; Back to Home
        </a>
        <h2 style={{ marginTop: 0 }}>Support</h2>
        <Empty description="Customer support is a later-phase feature — stub for now." />
      </div>
    );
  }
}

export default SupportPage;
