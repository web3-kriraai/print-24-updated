import React from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';

export function render(url: string) {
  try {
    console.log('[SSR] Rendering URL:', url);

    // Create memory router with the same routes as client
    const router = createMemoryRouter(routes, {
      initialEntries: [url],
    });

    // Render with RouterProvider
    const html = renderToString(
      <RouterProvider router={router} />
    );

    console.log('[SSR] ✅ Rendered HTML length:', html.length);
    if (html.length === 0) {
      console.warn('[SSR] ⚠️ Warning: Render returned empty string');
      return '<div><h1>Loading...</h1></div>';
    }

    return html;
  } catch (error) {
    console.error('[SSR] ❌ Render error:', error);
    // Fallback: render Home page or simple error
    return '<div><h1>Loading...</h1></div>';
  }
}
