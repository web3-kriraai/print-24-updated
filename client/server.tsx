import React from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';

function render(url: string) {
  try {
    console.log('[SSR] Rendering URL:', url);
    
    // Create memory router with the same routes as client
    const router = createMemoryRouter(routes, {
      initialEntries: [url],
    });
    
    // Render with RouterProvider - this matches the client structure
    // Don't use StrictMode in SSR as it can cause issues
    const html = renderToString(
      <RouterProvider router={router} />
    );
    
    console.log('[SSR] ✅ Rendered HTML length:', html.length);
    if (html.length === 0) {
      console.warn('[SSR] ⚠️ Warning: Render returned empty string');
      // Fallback to simple HTML
      return '<div><h1>Loading...</h1></div>';
    }
    
    // Log first 300 chars for debugging
    console.log('[SSR] First 300 chars:', html.substring(0, 1000));
    
    return html;
  } catch (error) {
    console.error('[SSR] ❌ Render error:', error);
    console.error('[SSR] Error message:', error.message);
    console.error('[SSR] Error stack:', error.stack);
    
    // Fallback: render Home page
    try {
      const router = createMemoryRouter(routes, { initialEntries: ['/'] });
      const html = renderToString(
        <RouterProvider router={router} />
      );
      console.log('[SSR] ✅ Fallback render successful, length:', html.length);
      return html;
    } catch (fallbackError) {
      console.error('[SSR] ❌ Fallback render also failed:', fallbackError);
      return '<div><h1>Server Error</h1><p>Please refresh the page.</p></div>';
    }
  }
}

// Export render function - ensure it's available
export { render };
export default render;

