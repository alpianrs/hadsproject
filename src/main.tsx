// Safe window.fetch getter/setter patch to prevent "Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const origFetch = window.fetch;
    let customFetch = origFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return customFetch;
      },
      set(fn) {
        customFetch = fn;
      }
    });
  }
} catch (e) {
  // Ignore descriptor redefine errors
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

