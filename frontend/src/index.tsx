// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

if (process.env.NODE_ENV === 'development') {
  const isResizeObserverError = (message: unknown) => {
    return typeof message === 'string' && message.includes('ResizeObserver loop completed with undelivered notifications');
  };

  // Capture before the development error overlay's listener sees this benign browser notification.
  window.addEventListener('error', (event) => {
    if (isResizeObserverError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isResizeObserverError((event.reason as Error | string)?.toString())) {
      event.preventDefault();
    }
  });
}


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>

    <App />

  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

serviceWorkerRegistration.register();