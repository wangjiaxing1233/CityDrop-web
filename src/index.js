import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { antdTheme } from './theme';
import './index.css';

// This is the one place the whole app "starts" — it finds the empty
// <div id="root"></div> in public/index.html and tells React to render
// <App /> inside it. Nothing here is CityDrop-specific; every
// Create React App project has a file that looks almost exactly like this.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={antdTheme}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
