#!/bin/bash

# Redis Docker Setup Script
# This script starts Redis using Docker with port forwarding

echo "🚀 Starting Redis with Docker..."
echo ""

# Check if Redis container is already running
if docker ps | grep -q pricing-redis; then
    echo "✅ Redis container is already running"
    docker ps | grep pricing-redis
else
    # Check if container exists but is stopped
    if docker ps -a | grep -q pricing-redis; then
        echo "🔄 Starting existing Redis container..."
        docker start pricing-redis
    else
        echo "📦 Creating new Redis container..."
        docker run -d \
            --name pricing-redis \
            -p 6379:6379 \
            -v redis-data:/data \
            redis:7-alpine \
            redis-server --appendonly yes
    fi
    
    echo "✅ Redis container started"
fi

echo ""
echo "📋 Redis Configuration:"
echo "   Container: pricing-redis"
echo "   Image: redis:7-alpine"
echo "   Port: 6379 (localhost:6379)"
echo "   Data: Persistent (redis-data volume)"
echo ""
echo "🔗 Connection URL: redis://localhost:6379"
echo ""
echo "💡 To connect from your app, use:"
echo "   REDIS_HOST=localhost"
echo "   REDIS_URL=redis://localhost:6379"
echo ""
echo "📊 To check Redis status:"
echo "   docker logs pricing-redis"
echo "   docker exec -it pricing-redis redis-cli ping"
echo ""
echo "🛑 To stop Redis:"
echo "   docker stop pricing-redis"
echo ""
echo "🗑️ To remove Redis (keeps data):"
echo "   docker rm pricing-redis"
echo ""
