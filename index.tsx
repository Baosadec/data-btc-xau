
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Safety check for browser environment
if (typeof process === 'undefined') {
  (window as any).process = { env: { API_KEY: '' } };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Mounting error:", error);
  rootElement.innerHTML = `<div style="color:red; padding: 20px;">Failed to mount React application.<br/>${error}</div>`;
}
