#!/bin/bash

# Qdrant Local Setup Script
# Based on latest Qdrant v1.13.0 Docker best practices

set -e

echo "🚀 Setting up Local Qdrant with Docker..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${BLUE}✅ Docker is running${NC}"

# Stop and remove existing Qdrant container if it exists
if docker ps -a --format 'table {{.Names}}' | grep -q "^qdrant$"; then
    echo -e "${YELLOW}🔄 Stopping and removing existing Qdrant container...${NC}"
    docker stop qdrant 2>/dev/null || true
    docker rm qdrant 2>/dev/null || true
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p ./qdrant_storage
mkdir -p ./config
mkdir -p ./logs

# Create optimized Qdrant configuration
echo -e "${BLUE}⚙️ Creating optimized configuration...${NC}"
cat > ./config/production.yaml << 'EOF'
# Qdrant Configuration for Local Development
service:
  host: 0.0.0.0
  http_port: 6333
  grpc_port: 6334
  max_request_size_mb: 32
  max_workers: 0  # Use all available CPU cores
  cors: true

storage:
  storage_path: /qdrant/storage
  snapshots_path: /qdrant/snapshots
  temp_path: /qdrant/temp
  optimizers_default_segment_number: 2
  
  # Performance optimizations for local development
  performance:
    max_search_threads: 0  # Use all available cores
    max_optimization_threads: 2
    indexing_threshold_kb: 20000
    flush_interval_sec: 5
    
  # Default HNSW parameters
  hnsw_index:
    m: 16
    ef_construct: 100
    full_scan_threshold: 10000
    max_indexing_threads: 0
    on_disk: false  # Keep in memory for better dev performance
    payload_m: 16

  # WAL configuration
  wal:
    wal_capacity_mb: 32
    wal_segments_ahead: 0

log_level: INFO

# Telemetry (disable for local development)
telemetry_disabled: true

# Cluster configuration (not needed for local)
cluster:
  enabled: false
EOF

echo -e "${GREEN}✅ Configuration created at ./config/production.yaml${NC}"

# Create environment file for easy management
cat > ./.env.qdrant << 'EOF'
# Qdrant Local Development Environment
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_GRPC_URL=http://localhost:6334
QDRANT_LOG_LEVEL=INFO
QDRANT_WEB_UI=http://localhost:6333/dashboard
EOF

echo -e "${GREEN}✅ Environment file created at ./.env.qdrant${NC}"

# Pull the latest Qdrant image
echo -e "${BLUE}📥 Pulling latest Qdrant Docker image...${NC}"
docker pull qdrant/qdrant:latest

# Run Qdrant container with optimized settings
echo -e "${BLUE}🐳 Starting Qdrant container...${NC}"
docker run -d \
  --name qdrant \
  --restart unless-stopped \
  -p 6333:6333 \
  -p 6334:6334 \
  -v "$(pwd)/qdrant_storage:/qdrant/storage" \
  -v "$(pwd)/config/production.yaml:/qdrant/config/production.yaml:ro" \
  -v "$(pwd)/logs:/qdrant/logs" \
  -e QDRANT__LOG_LEVEL=INFO \
  -e QDRANT__SERVICE__MAX_WORKERS=0 \
  -e QDRANT__STORAGE__PERFORMANCE__MAX_SEARCH_THREADS=0 \
  -e QDRANT__TELEMETRY_DISABLED=true \
  --memory=4g \
  --cpus=2 \
  qdrant/qdrant:latest

# Wait for Qdrant to start
echo -e "${YELLOW}⏳ Waiting for Qdrant to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:6333/health > /dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Check if Qdrant is running
if curl -s http://localhost:6333/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Qdrant is running successfully!${NC}"
    echo ""
    echo "================================================"
    echo -e "${GREEN}🎉 Qdrant Local Setup Complete!${NC}"
    echo "================================================"
    echo ""
    echo -e "${BLUE}📊 Connection Details:${NC}"
    echo "   REST API:  http://localhost:6333"
    echo "   gRPC API:  http://localhost:6334"
    echo "   Web UI:    http://localhost:6333/dashboard"
    echo "   Health:    http://localhost:6333/health"
    echo ""
    echo -e "${BLUE}📁 Data Storage:${NC}"
    echo "   Data:      $(pwd)/qdrant_storage"
    echo "   Config:    $(pwd)/config/production.yaml"
    echo "   Logs:      $(pwd)/logs"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "   Stop:      docker stop qdrant"
    echo "   Start:     docker start qdrant"
    echo "   Restart:   docker restart qdrant"
    echo "   Logs:      docker logs qdrant -f"
    echo "   Remove:    docker stop qdrant && docker rm qdrant"
    echo ""
    echo -e "${BLUE}🧪 Test Connection:${NC}"
    echo "   curl http://localhost:6333/health"
    echo "   curl http://localhost:6333/collections"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo "   1. Update your .env file:"
    echo "      QDRANT_URL=http://localhost:6333"
    echo "      QDRANT_API_KEY="
    echo "   2. Run: node verify-rag-pipeline.js"
    echo ""
    
    # Test basic functionality
    echo -e "${BLUE}🔍 Testing basic functionality...${NC}"
    
    # Get health status
    HEALTH=$(curl -s http://localhost:6333/health)
    echo "   Health Status: $HEALTH"
    
    # Get collections (should be empty initially)
    COLLECTIONS=$(curl -s http://localhost:6333/collections)
    echo "   Collections: $COLLECTIONS"
    
    # Check telemetry endpoint
    TELEMETRY=$(curl -s http://localhost:6333/telemetry)
    echo "   Telemetry: $TELEMETRY"
    
else
    echo -e "${RED}❌ Failed to start Qdrant. Check the logs:${NC}"
    echo "   docker logs qdrant"
    exit 1
fi

echo ""
echo -e "${GREEN}🎯 Qdrant is ready for your RAG pipeline!${NC}"