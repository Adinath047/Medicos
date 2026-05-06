import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { initSync } from './sync/syncManager';
import { useAuthStore } from './store/authStore';

// Restore JWT session before rendering
useAuthStore.getState().restoreSession();

// Start sync engine
initSync().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
