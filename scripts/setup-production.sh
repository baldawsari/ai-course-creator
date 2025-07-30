#!/bin/bash

# ==============================================================================
# AI Course Creator - Production Setup Script
# ==============================================================================
# This script automates the initial setup of the AI Course Creator application
# for production deployment. It handles environment configuration, dependency
# installation, and basic security checks.
#
# Usage: ./scripts/setup-production.sh
# ==============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_FILE="$ROOT_DIR/setup-production.log"

# ==============================================================================
# Helper Functions
# ==============================================================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is not installed. Please install it and try again."
    fi
}

generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

prompt_value() {
    local prompt="$1"
    local var_name="$2"
    local default="${3:-}"
    local secret="${4:-false}"
    
    if [ "$secret" = true ]; then
        read -s -p "$prompt" value
        echo
    else
        read -p "$prompt" value
    fi
    
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    
    if [ -z "$value" ]; then
        error "No value provided for $var_name"
    fi
    
    eval "$var_name='$value'"
}

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

log "Starting AI Course Creator Production Setup"
log "============================================"

# Check required commands
info "Checking required dependencies..."
check_command "node"
check_command "npm"
check_command "git"
check_command "openssl"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18 or higher is required. Current version: $(node -v)"
fi

# Check if we're in the right directory
if [ ! -f "$ROOT_DIR/package.json" ] || [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    error "Please run this script from the root of the AI Course Creator project"
fi

# ==============================================================================
# Environment Configuration
# ==============================================================================

log "Configuring environment variables..."

# Create .env files from examples
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    info "Created backend/.env from example"
else
    warning "backend/.env already exists, skipping..."
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    cp "$FRONTEND_DIR/.env.local.example" "$FRONTEND_DIR/.env.local"
    info "Created frontend/.env.local from example"
else
    warning "frontend/.env.local already exists, skipping..."
fi

# ==============================================================================
# Interactive Configuration
# ==============================================================================

echo
log "Let's configure your production environment"
echo "==========================================="
echo

# Ask for deployment type
echo "Select your deployment environment:"
echo "1) Production"
echo "2) Staging"
echo "3) Development"
read -p "Enter choice [1-3]: " env_choice

case $env_choice in
    1) NODE_ENV="production" ;;
    2) NODE_ENV="staging" ;;
    3) NODE_ENV="development" ;;
    *) error "Invalid choice" ;;
esac

# Configure Supabase
echo
info "Configuring Supabase (Database)..."
echo "Sign up at https://supabase.com if you haven't already"
echo
prompt_value "Enter your Supabase URL (e.g., https://abc.supabase.co): " SUPABASE_URL
prompt_value "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
prompt_value "Enter your Supabase Service Key: " SUPABASE_SERVICE_KEY "" true

# Configure AI Services
echo
info "Configuring AI Services..."
echo "Get your Anthropic API key from https://console.anthropic.com"
prompt_value "Enter your Anthropic API Key: " ANTHROPIC_API_KEY "" true
echo
echo "Get your Jina AI key from https://jina.ai (free tier available)"
prompt_value "Enter your Jina AI Key: " JINA_API_KEY "" true

# Configure Application URLs
echo
info "Configuring Application URLs..."
prompt_value "Enter your backend URL (e.g., https://api.yourdomain.com): " BACKEND_URL "http://localhost:3001"
prompt_value "Enter your frontend URL (e.g., https://courses.yourdomain.com): " FRONTEND_URL "http://localhost:3000"

# Generate secrets
echo
info "Generating secure secrets..."
JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)
log "Generated JWT and Session secrets"

# Configure Redis
echo
info "Configuring Redis..."
prompt_value "Enter Redis host [localhost]: " REDIS_HOST "localhost"
prompt_value "Enter Redis port [6379]: " REDIS_PORT "6379"
prompt_value "Enter Redis password (leave empty for none): " REDIS_PASSWORD "" true

# Configure Qdrant
echo
info "Configuring Qdrant Vector Database..."
prompt_value "Enter Qdrant URL [http://localhost:6333]: " QDRANT_URL "http://localhost:6333"
prompt_value "Enter Qdrant API Key (leave empty for local): " QDRANT_API_KEY "" true

# ==============================================================================
# Update Environment Files
# ==============================================================================

log "Updating environment files..."

# Update backend .env
update_env_file() {
    local file="$1"
    local key="$2"
    local value="$3"
    
    if grep -q "^${key}=" "$file"; then
        # Use a different delimiter for sed to handle URLs with slashes
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

# Backend environment variables
update_env_file "$BACKEND_DIR/.env" "NODE_ENV" "$NODE_ENV"
update_env_file "$BACKEND_DIR/.env" "FRONTEND_URL" "$FRONTEND_URL"
update_env_file "$BACKEND_DIR/.env" "SUPABASE_URL" "$SUPABASE_URL"
update_env_file "$BACKEND_DIR/.env" "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
update_env_file "$BACKEND_DIR/.env" "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY"
update_env_file "$BACKEND_DIR/.env" "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
update_env_file "$BACKEND_DIR/.env" "JINA_API_KEY" "$JINA_API_KEY"
update_env_file "$BACKEND_DIR/.env" "JWT_SECRET" "$JWT_SECRET"
update_env_file "$BACKEND_DIR/.env" "SESSION_SECRET" "$SESSION_SECRET"
update_env_file "$BACKEND_DIR/.env" "REDIS_HOST" "$REDIS_HOST"
update_env_file "$BACKEND_DIR/.env" "REDIS_PORT" "$REDIS_PORT"
update_env_file "$BACKEND_DIR/.env" "REDIS_PASSWORD" "$REDIS_PASSWORD"
update_env_file "$BACKEND_DIR/.env" "QDRANT_URL" "$QDRANT_URL"
update_env_file "$BACKEND_DIR/.env" "QDRANT_API_KEY" "$QDRANT_API_KEY"

# Frontend environment variables
update_env_file "$FRONTEND_DIR/.env.local" "NEXT_PUBLIC_API_URL" "$BACKEND_URL"
update_env_file "$FRONTEND_DIR/.env.local" "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
update_env_file "$FRONTEND_DIR/.env.local" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
update_env_file "$FRONTEND_DIR/.env.local" "NEXT_PUBLIC_APP_URL" "$FRONTEND_URL"

# Remove backup files
rm -f "$BACKEND_DIR/.env.bak" "$FRONTEND_DIR/.env.local.bak"

# ==============================================================================
# Security Checks
# ==============================================================================

log "Performing security checks..."

# Set proper file permissions
chmod 600 "$BACKEND_DIR/.env"
chmod 600 "$FRONTEND_DIR/.env.local"
info "Set secure permissions on .env files"

# Check for default values
if grep -q "your_" "$BACKEND_DIR/.env"; then
    warning "Some environment variables still have placeholder values!"
    warning "Please update all 'your_*' values in backend/.env"
fi

# ==============================================================================
# Install Dependencies
# ==============================================================================

if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    log "Installing production dependencies..."
    
    # Backend dependencies
    cd "$BACKEND_DIR"
    npm ci --production
    
    # Frontend dependencies
    cd "$FRONTEND_DIR"
    npm ci
    
    cd "$ROOT_DIR"
else
    log "Skipping dependency installation for development environment"
fi

# ==============================================================================
# Database Setup
# ==============================================================================

echo
read -p "Do you want to run database migrations now? (y/n): " run_migrations

if [ "$run_migrations" = "y" ]; then
    log "Running database migrations..."
    cd "$BACKEND_DIR"
    npm run migration:run
    cd "$ROOT_DIR"
else
    warning "Remember to run migrations manually: cd backend && npm run migration:run"
fi

# ==============================================================================
# Build Applications
# ==============================================================================

if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    echo
    read -p "Do you want to build the applications now? (y/n): " build_apps
    
    if [ "$build_apps" = "y" ]; then
        log "Building applications..."
        
        # Build backend
        cd "$BACKEND_DIR"
        npm run build
        
        # Build frontend
        cd "$FRONTEND_DIR"
        npm run build
        
        cd "$ROOT_DIR"
    else
        warning "Remember to build manually before starting:"
        warning "  Backend: cd backend && npm run build"
        warning "  Frontend: cd frontend && npm run build"
    fi
fi

# ==============================================================================
# Create PM2 Ecosystem File
# ==============================================================================

if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    log "Creating PM2 ecosystem configuration..."
    
    cat > "$ROOT_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ai-course-backend',
      script: './backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'ai-course-worker',
      script: './backend/dist/worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log'
    },
    {
      name: 'ai-course-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log'
    }
  ]
};
EOF
    
    info "Created PM2 ecosystem configuration"
fi

# ==============================================================================
# Create Log Directory
# ==============================================================================

mkdir -p "$ROOT_DIR/logs"
info "Created logs directory"

# ==============================================================================
# Final Steps
# ==============================================================================

log "Setup completed successfully!"
echo
echo "=============================================="
echo "Next Steps:"
echo "=============================================="
echo

if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    echo "1. Review and update any remaining placeholder values in:"
    echo "   - backend/.env"
    echo "   - frontend/.env.local"
    echo
    echo "2. Set up your web server (Nginx/Apache) with SSL"
    echo "   See docs/DEPLOYMENT.md for configuration examples"
    echo
    echo "3. Start the applications:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
    echo "   pm2 startup"
    echo
    echo "4. Set up monitoring and backups"
    echo "   See docs/DEPLOYMENT.md for recommendations"
else
    echo "1. Start the development servers:"
    echo "   Backend: cd backend && npm run dev"
    echo "   Frontend: cd frontend && npm run dev"
    echo
    echo "2. Access the application at:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend API: $BACKEND_URL"
fi

echo
echo "For detailed instructions, see:"
echo "- docs/DEPLOYMENT.md - Complete deployment guide"
echo "- docs/ENVIRONMENT.md - Environment variables reference"
echo "- docs/SECURITY.md - Security best practices"
echo
log "Setup log saved to: $LOG_FILE"