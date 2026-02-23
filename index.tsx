import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/* ✅ Защита от автоперевода Chrome */
rootElement.setAttribute('translate', 'no');
rootElement.classList.add('notranslate');

/* Иногда Google Translate оборачивает страницу в iframe — блокируем */
document.documentElement.setAttribute('translate', 'no');
document.documentElement.classList.add('notranslate');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);