#!/bin/bash

# Qdrant Management Script
# Easy commands to manage your local Qdrant instance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONTAINER_NAME="qdrant"

show_usage() {
    echo "Qdrant Management Script"
    echo "========================"
    echo ""
    echo "Usage: ./qdrant-manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start Qdrant container"
    echo "  stop      - Stop Qdrant container"
    echo "  restart   - Restart Qdrant container"
    echo "  status    - Show container status"
    echo "  logs      - Show container logs"
    echo "  logs-f    - Follow container logs"
    echo "  health    - Check Qdrant health"
    echo "  info      - Show Qdrant cluster info"
    echo "  ui        - Open Qdrant web UI"
    echo "  collections - List all collections"
    echo "  remove    - Stop and remove container"
    echo "  reset     - Remove container and all data"
    echo "  backup    - Create backup of data"
    echo "  help      - Show this help"
    echo ""
}

check_container_exists() {
    if ! docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${RED}❌ Container '${CONTAINER_NAME}' does not exist.${NC}"
        echo -e "${YELLOW}💡 Run './setup-local-qdrant.sh' to create it.${NC}"
        exit 1
    fi
}

check_docker() {
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

case "${1:-help}" in
    start)
        check_docker
        check_container_exists
        echo -e "${BLUE}🚀 Starting Qdrant container...${NC}"
        docker start $CONTAINER_NAME
        echo -e "${GREEN}✅ Qdrant started${NC}"
        sleep 2
        echo -e "${BLUE}🔍 Health check:${NC}"
        curl -s http://localhost:6333/health || echo -e "${YELLOW}⏳ Still starting up...${NC}"
        ;;
        
    stop)
        check_docker
        check_container_exists
        echo -e "${BLUE}🛑 Stopping Qdrant container...${NC}"
        docker stop $CONTAINER_NAME
        echo -e "${GREEN}✅ Qdrant stopped${NC}"
        ;;
        
    restart)
        check_docker
        check_container_exists
        echo -e "${BLUE}🔄 Restarting Qdrant container...${NC}"
        docker restart $CONTAINER_NAME
        echo -e "${GREEN}✅ Qdrant restarted${NC}"
        sleep 3
        curl -s http://localhost:6333/health || echo -e "${YELLOW}⏳ Still starting up...${NC}"
        ;;
        
    status)
        check_docker
        echo -e "${BLUE}📊 Container Status:${NC}"
        if docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -q "^${CONTAINER_NAME}"; then
            docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep "^${CONTAINER_NAME}"
            echo ""
            echo -e "${BLUE}🔍 Health Status:${NC}"
            if curl -s http://localhost:6333/health > /dev/null 2>&1; then
                HEALTH=$(curl -s http://localhost:6333/health)
                echo "   $HEALTH"
            else
                echo -e "${RED}   Not responding${NC}"
            fi
        else
            echo -e "${YELLOW}   Container is not running${NC}"
        fi
        ;;
        
    logs)
        check_docker
        check_container_exists
        echo -e "${BLUE}📋 Recent logs:${NC}"
        docker logs $CONTAINER_NAME --tail 50
        ;;
        
    logs-f)
        check_docker
        check_container_exists
        echo -e "${BLUE}📋 Following logs (Ctrl+C to exit):${NC}"
        docker logs $CONTAINER_NAME -f
        ;;
        
    health)
        echo -e "${BLUE}🔍 Checking Qdrant health...${NC}"
        if curl -s http://localhost:6333/health > /dev/null 2>&1; then
            HEALTH=$(curl -s http://localhost:6333/health)
            echo -e "${GREEN}✅ Healthy: $HEALTH${NC}"
            
            # Additional info
            echo -e "${BLUE}📊 Cluster info:${NC}"
            curl -s http://localhost:6333/cluster 2>/dev/null | jq . 2>/dev/null || echo "   Cluster info not available"
            
            echo -e "${BLUE}📈 Telemetry:${NC}"
            curl -s http://localhost:6333/telemetry 2>/dev/null | jq . 2>/dev/null || echo "   Telemetry disabled"
        else
            echo -e "${RED}❌ Qdrant is not responding${NC}"
            echo -e "${YELLOW}💡 Try: ./qdrant-manage.sh restart${NC}"
        fi
        ;;
        
    info)
        echo -e "${BLUE}ℹ️  Qdrant Information:${NC}"
        echo "   REST API:  http://localhost:6333"
        echo "   gRPC API:  http://localhost:6334"
        echo "   Web UI:    http://localhost:6333/dashboard"
        echo "   Health:    http://localhost:6333/health"
        echo ""
        echo -e "${BLUE}📁 Local Paths:${NC}"
        echo "   Data:      $(pwd)/qdrant_storage"
        echo "   Config:    $(pwd)/config/production.yaml"
        echo "   Logs:      $(pwd)/logs"
        ;;
        
    ui)
        echo -e "${BLUE}🌐 Opening Qdrant Web UI...${NC}"
        if command -v open > /dev/null; then
            open http://localhost:6333/dashboard
        elif command -v xdg-open > /dev/null; then
            xdg-open http://localhost:6333/dashboard
        else
            echo "   Please open: http://localhost:6333/dashboard"
        fi
        ;;
        
    collections)
        echo -e "${BLUE}📚 Listing collections...${NC}"
        if curl -s http://localhost:6333/health > /dev/null 2>&1; then
            COLLECTIONS=$(curl -s http://localhost:6333/collections)
            echo "$COLLECTIONS" | jq . 2>/dev/null || echo "$COLLECTIONS"
        else
            echo -e "${RED}❌ Qdrant is not responding${NC}"
        fi
        ;;
        
    remove)
        check_docker
        echo -e "${YELLOW}⚠️  This will stop and remove the Qdrant container.${NC}"
        echo -e "${YELLOW}   Data will be preserved in ./qdrant_storage${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker stop $CONTAINER_NAME 2>/dev/null || true
            docker rm $CONTAINER_NAME 2>/dev/null || true
            echo -e "${GREEN}✅ Container removed${NC}"
            echo -e "${BLUE}💡 Run './setup-local-qdrant.sh' to recreate${NC}"
        else
            echo "Cancelled"
        fi
        ;;
        
    reset)
        check_docker
        echo -e "${RED}⚠️  DANGER: This will remove the container AND ALL DATA!${NC}"
        echo -e "${YELLOW}   This action cannot be undone.${NC}"
        read -p "Are you absolutely sure? (type 'yes'): " -r
        if [[ $REPLY == "yes" ]]; then
            docker stop $CONTAINER_NAME 2>/dev/null || true
            docker rm $CONTAINER_NAME 2>/dev/null || true
            sudo rm -rf ./qdrant_storage ./logs
            echo -e "${GREEN}✅ Container and data removed${NC}"
            echo -e "${BLUE}💡 Run './setup-local-qdrant.sh' to start fresh${NC}"
        else
            echo "Cancelled"
        fi
        ;;
        
    backup)
        check_docker
        BACKUP_NAME="qdrant_backup_$(date +%Y%m%d_%H%M%S)"
        echo -e "${BLUE}💾 Creating backup: $BACKUP_NAME${NC}"
        
        # Create backup directory
        mkdir -p ./backups
        
        # Stop container temporarily
        WAS_RUNNING=$(docker ps --format '{{.Names}}' | grep "^${CONTAINER_NAME}$" || echo "")
        if [ ! -z "$WAS_RUNNING" ]; then
            echo "   Stopping container..."
            docker stop $CONTAINER_NAME
        fi
        
        # Create tar backup
        tar -czf "./backups/${BACKUP_NAME}.tar.gz" -C . qdrant_storage config
        
        # Restart if it was running
        if [ ! -z "$WAS_RUNNING" ]; then
            echo "   Restarting container..."
            docker start $CONTAINER_NAME
        fi
        
        echo -e "${GREEN}✅ Backup created: ./backups/${BACKUP_NAME}.tar.gz${NC}"
        ;;
        
    help|*)
        show_usage
        ;;
esac