# Print24 - E-commerce Platform

A full-stack e-commerce platform with React frontend and Node.js backend, deployable to Google Cloud Platform.

## 🏗️ Architecture

**Monolithic Deployment**: Client and server deployed together on GCP Cloud Run
- **Frontend**: React 19 with SSR (Server-Side Rendering)
- **Backend**: Express.js API server
- **Database**: MongoDB Atlas
- **Hosting**: Google Cloud Run (asia-south1 - Mumbai)
- **Storage**: Cloudinary for images

## 📁 Project Structure

```
print24-updated/
├── client/                 # React frontend
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── lib/              # Utilities and API config
│   ├── dist/             # Build output (generated)
│   └── package.json
├── server/                # Express backend
│   ├── src/              # Server source code
│   │   ├── routes/      # API routes
│   │   ├── models/      # MongoDB models
│   │   └── server.js    # Main server file
│   └── package.json
├── Dockerfile            # Multi-stage Docker build
├── setup-gcp.ps1         # One-time GCP setup
├── deploy-gcp.ps1        # Deployment script
├── QUICK_START_GCP.md    # Quick start guide
└── DEPLOYMENT_GUIDE.md   # Detailed deployment guide
```

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
```powershell
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

2. **Setup environment variables:**

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_TEST_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Create `client/.env` (optional for dev):
```env
VITE_API_BASE_URL=http://localhost:5000
```

3. **Run development servers:**

**Terminal 1 - Client (with hot reload):**
```powershell
cd client
npm run dev
# Access at http://localhost:3000
```

**Terminal 2 - Server:**
```powershell
cd server
npm start
# API at http://localhost:5000
```

### Production Build (Local Test)

```powershell
# Build everything
.\build-production.ps1

# Start server (serves both API and client)
cd server
npm start
# Access at http://localhost:5000
```

## ☁️ Deploy to GCP

**See [QUICK_START_GCP.md](./QUICK_START_GCP.md) for deployment guide**

Quick deployment:

```powershell
# 1. One-time setup (run once)
.\setup-gcp.ps1

# 2. Deploy application
.\deploy-gcp.ps1
```

**GCP Configuration:**
- Region: asia-south1 (Mumbai)
- Service: ecommerce-monolith
- Min instances: 1 (always warm)
- Max instances: 4
- CPU: 1 vCPU, Memory: 1GB

## 📚 Documentation

- **[QUICK_START_GCP.md](./QUICK_START_GCP.md)** - Quick deployment guide
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Detailed deployment documentation
- **[client/.env.example](./client/.env.example)** - Client environment variables
- **[server/.env.example](./server/.env.example)** - Server environment variables

## 🎯 Features

### Frontend
- ✅ React 19 with TypeScript
- ✅ Server-Side Rendering (SSR)
- ✅ React Router v7
- ✅ Responsive design
- ✅ Tailwind CSS
- ✅ Framer Motion animations
- ✅ Client-side hydration

### Backend
- ✅ Express.js REST API
- ✅ MongoDB with Mongoose
- ✅ JWT authentication
- ✅ File upload (Cloudinary)
- ✅ Email notifications
- ✅ SSR support
- ✅ Health check endpoint

### Deployment
- ✅ Docker containerization
- ✅ Google Cloud Run
- ✅ Artifact Registry
- ✅ Secret Manager integration
- ✅ Auto-scaling
- ✅ Production-ready

## 🛠️ Scripts

### Client Scripts
```powershell
npm run dev       # Development server (Vite)
npm run build     # Production build
npm run preview   # Preview production build
```

### Server Scripts
```powershell
npm start         # Start server
```

### Root Scripts
```powershell
.\build-production.ps1    # Build for production
.\setup-gcp.ps1          # Setup GCP resources
.\deploy-gcp.ps1         # Deploy to GCP
```

## 🔧 Environment Variables

### Client (.env)
- `VITE_API_BASE_URL` - API URL (dev only, auto in production)

### Server (.env)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGO_TEST_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `EMAIL_HOST` - SMTP host
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password

## 📊 API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/products` - Get products
- `POST /api/products` - Create product (admin)
- And more...

## 🔐 Security

- ✅ JWT authentication
- ✅ Secrets stored in GCP Secret Manager
- ✅ HTTPS by default (Cloud Run)
- ✅ CORS configured
- ✅ Input validation
- ✅ MongoDB injection prevention

## 💰 Estimated Costs

**Monthly GCP costs: ~$15-30**
- Cloud Run: $10-20
- Artifact Registry: $0.10
- Secret Manager: $0.06
- Networking: ~$5

**Free tier:** 2 million requests/month included

## 🐛 Troubleshooting

See [QUICK_START_GCP.md](./QUICK_START_GCP.md#-common-issues--fixes) for common issues and solutions.

**Quick fixes:**
```powershell
# View logs
gcloud run logs read --service ecommerce-monolith --limit 100

# Update secret
echo "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Rebuild and redeploy
.\deploy-gcp.ps1
```

## 📝 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. Contact the project owner for contribution guidelines.

