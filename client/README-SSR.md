# Server-Side Rendering (SSR) Setup

This application now supports Server-Side Rendering (SSR) for improved SEO and initial page load performance.

## Build Process

1. **Build the client bundle:**
   ```bash
   cd client
   npm run build
   ```

2. **Build the server bundle:**
   ```bash
   npm run build:server
   ```

   Or build both at once:
   ```bash
   npm run build:all
   ```

## Running the SSR Application

1. Start the backend server (which serves the SSR app):
   ```bash
   cd backend
   npm start
   ```

The server will:
- Serve API routes at `/api/*`
- Serve static assets from `client/dist`
- Render React components server-side for all other routes
- Fall back to client-side rendering if SSR fails

## Development

For development, you can still use:
```bash
cd client
npm run dev
```

This runs the Vite dev server with hot module replacement. The SSR build is only needed for production.

## How It Works

1. **Server Entry (`server.tsx`)**: Renders React components to HTML strings using `renderToString`
2. **Client Entry (`client.tsx`)**: Hydrates the server-rendered HTML using `hydrateRoot`
3. **Backend Server**: Serves the SSR HTML and handles API routes
4. **App Component**: Uses `BrowserRouter` (client) or `StaticRouter` (server) based on environment

## Notes

- The app uses `BrowserRouter` for client-side navigation (replaced `HashRouter`)
- All existing functionality remains unchanged
- SSR improves SEO and initial load time
- Client-side hydration ensures interactivity after initial render

