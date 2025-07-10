#!/bin/bash

# AI Course Creator Test Setup Script
# This script sets up the testing environment and makes scripts executable

echo "🔧 Setting up AI Course Creator Test Environment"
echo "================================================"

# Make test scripts executable
echo "📝 Making test scripts executable..."
chmod +x test-end-to-end-workflow.js
chmod +x test-config.js
chmod +x test-components.js
chmod +x run-tests.js
chmod +x setup-tests.sh

# Check if required files exist
echo "📂 Checking required files..."

REQUIRED_FILES=(
    "backend/package.json"
    "backend/src/app.js" 
    "backend/src/services/courseGenerator.js"
    "backend/src/routes/courses.js"
    "backend/src/routes/generation.js"
    "backend/src/routes/export.js"
    "verify-rag-simple.js"
    "verify-claude-service.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

# Check if .env file exists
echo ""
echo "🔐 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "⚠️  .env file not found - you'll need to create one"
fi

# Install dependencies if needed
echo ""
echo "📦 Checking dependencies..."
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing root dependencies..."
        npm install
    else
        echo "✅ Root dependencies installed"
    fi
fi

if [ -f "backend/package.json" ]; then
    if [ ! -d "backend/node_modules" ]; then
        echo "Installing backend dependencies..."
        cd backend && npm install && cd ..
    else
        echo "✅ Backend dependencies installed"
    fi
fi

# Create temp directory
echo ""
echo "📁 Creating temp directory..."
mkdir -p temp
echo "✅ Temp directory created"

echo ""
echo "🧪 Test Environment Setup Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo "1. Configure your environment:"
echo "   node test-config.js setup"
echo ""
echo "2. Update .env.test with your API keys and configuration"
echo ""
echo "3. Start your backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Run health checks:"
echo "   node test-config.js health"
echo ""
echo "5. Run component tests:"
echo "   node test-components.js all-component"
echo ""
echo "6. Run end-to-end tests:"
echo "   node test-end-to-end-workflow.js"
echo ""
echo "7. Run complete test suite:"
echo "   node run-tests.js"
echo ""
echo "📚 Available Test Commands:"
echo "  node test-config.js setup           # Setup environment"
echo "  node test-config.js health          # Health checks"
echo "  node test-components.js <test>      # Individual component tests"
echo "  node test-end-to-end-workflow.js    # Complete workflow test"
echo "  node run-tests.js                   # Master test runner"
echo ""
echo "🔗 Quick Test Examples:"
echo "  node test-components.js rag claude  # Test RAG and Claude"
echo "  node run-tests.js health e2e        # Health + end-to-end"
echo "  node run-tests.js component         # All component tests"
echo ""
echo "Happy testing! 🎉"