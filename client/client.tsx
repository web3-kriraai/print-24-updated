import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { routes } from './routes';
// PrimeReact CSS
import 'primereact/resources/themes/lara-light-amber/theme.css';
import 'primereact/resources/primereact.min.css';
import 'quill/dist/quill.snow.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create browser router
const router = createBrowserRouter(routes);

// Client-side rendering only (no SSR)
const root = createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
);
