
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Create a root for React to render into
const root = document.getElementById('root');

// Make sure the root element exists before rendering
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found, cannot mount React application');
}
