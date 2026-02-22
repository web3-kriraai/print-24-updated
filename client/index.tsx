import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from 'react-hot-toast';
// PrimeReact CSS
import 'primereact/resources/themes/lara-light-amber/theme.css';
import 'primereact/resources/primereact.min.css';
import 'quill/dist/quill.snow.css';
// Performance optimizations CSS
import './styles/performance.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Global handler to disable scroll on numeric fields
const preventNumericScroll = (e: WheelEvent) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    // If the input is focused, blur it to prevent value change while allowing page scroll
    if (document.activeElement === target) {
      (target as HTMLInputElement).blur();
    }
    // Alternatively, just prevent default if we want to stay focused but not change value
    // e.preventDefault(); 
  }
};

// Global handler to prevent Arrow keys from changing value in numeric fields
const preventNumericKeys = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  }
};

// Global handler to ensure 6 decimal places are allowed on any numeric input
const ensureDecimalPrecision = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    // Force 6 decimal places to bypass any existing coarser step constraints
    // Only apply if no step is already defined or if it's coarser than 0.000001
    const currentStep = target.getAttribute('step');
    if (!currentStep || parseFloat(currentStep) > 0.000001) {
      target.step = '0.000001';
    }
  }
};

// Attach listeners to window using capture: true to catch events before any component-level handlers
window.addEventListener('wheel', preventNumericScroll, { passive: false, capture: true });
window.addEventListener('mousewheel', preventNumericScroll as any, { passive: false, capture: true });
window.addEventListener('DOMMouseScroll', preventNumericScroll as any, { passive: false, capture: true });
window.addEventListener('keydown', preventNumericKeys, { capture: true });
window.addEventListener('focusin', ensureDecimalPrecision, { capture: true });

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" />
    </BrowserRouter>
  </React.StrictMode>
);