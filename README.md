# Prints24 SSR Project

This is the restructured project with complete Server-Side Rendering (SSR) support.

## Project Structure

```
print24-ssr/
├── client/          # React frontend with SSR
│   ├── src/         # Source files (will be created after build)
│   ├── dist/        # Build output (generated)
│   ├── public/      # Static assets
│   └── package.json
├── server/          # Express backend with SSR support
│   ├── src/         # Server source code
│   ├── uploads/     # Uploaded files
│   └── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 2. Environment Variables

Create a `.env` file in the `server` folder with:
```
MONGO_URI_PRICING=your_mongodb_connection_string
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

### 3. Build Client

```bash
cd client
npm run build
```

This will create the `dist` folder with:
- `index.html` - HTML template
- `client.js` - Client-side hydration script
- `ssr.js` - Server-side rendering script
- `assets/` - Static assets

### 4. Start Server

```bash
cd server
npm start
```

The server will:
- Serve API routes at `/api/*`
- Serve static assets from `client/dist`
- Render React components server-side for all other routes
- Handle SSR with proper hydration

## Development

For development with hot reload:

**Client (separate terminal):**
```bash
cd client
npm run dev
```

This runs Vite dev server on `http://localhost:3000`

**Server (separate terminal):**
```bash
cd server
npm start
```

This runs the Express server on `http://localhost:5000`

## Production

1. Build the client: `cd client && npm run build`
2. Start the server: `cd server && npm start`
3. Access the app at `http://localhost:5000`

## SSR Features

- ✅ Complete server-side rendering
- ✅ Client-side hydration
- ✅ No hydration mismatches
- ✅ SEO-friendly HTML output
- ✅ Fast initial page load
- ✅ React Router v7 with RouterProvider
- ✅ Shared routes configuration

## Notes

- The server serves the built client from `client/dist`
- SSR is handled by `server/src/server.js`
- Client hydration is handled by `client/client.tsx`
- Routes are defined in `client/routes.tsx` (shared by server and client)

