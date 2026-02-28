#!/bin/bash
set -e

echo "======================================"
echo "🚀 Deploying Primer Production Stack"
echo "======================================"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

if [ ! -f "../server/.env.production" ]; then
    echo "⚠️  ERROR: ../server/.env.production not found!"
    echo "Please copy infra/.env.production.example to server/.env.production and fill in your secrets."
    exit 1
fi

echo "📦 Building optimized Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "🚢 Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "✅ Deployment complete!"
echo "Your frontend is running on http://localhost (or your configured domain)"
echo "To view logs: docker compose -f docker-compose.prod.yml logs -f"
