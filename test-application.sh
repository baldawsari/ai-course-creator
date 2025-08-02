#!/bin/bash

echo "🧪 Testing AI Course Creator Application"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test backend health
echo -e "\n${YELLOW}1. Testing Backend Health...${NC}"
BACKEND_HEALTH=$(curl -s http://localhost:3001/health || echo "FAILED")
if [[ $BACKEND_HEALTH == *"ok"* ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "Response: $BACKEND_HEALTH"
fi

# Test backend API endpoint
echo -e "\n${YELLOW}2. Testing Backend API...${NC}"
API_RESPONSE=$(curl -s http://localhost:3001/api || echo "FAILED")
if [[ $API_RESPONSE == *"AI Course Creator"* ]] || [[ $API_RESPONSE == *"api"* ]]; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${RED}❌ Backend API check failed${NC}"
    echo "Response: $API_RESPONSE"
fi

# Test frontend
echo -e "\n${YELLOW}3. Testing Frontend...${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [[ $FRONTEND_RESPONSE == "200" ]]; then
    echo -e "${GREEN}✅ Frontend is responding (HTTP $FRONTEND_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Frontend check failed (HTTP $FRONTEND_RESPONSE)${NC}"
fi

# Test CORS configuration
echo -e "\n${YELLOW}4. Testing CORS Configuration...${NC}"
CORS_TEST=$(curl -s -I -X OPTIONS http://localhost:3001/api \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" || echo "FAILED")
if [[ $CORS_TEST == *"Access-Control-Allow-Origin"* ]]; then
    echo -e "${GREEN}✅ CORS is properly configured${NC}"
else
    echo -e "${RED}❌ CORS configuration issue${NC}"
fi

# Summary
echo -e "\n${YELLOW}Summary:${NC}"
echo "- Backend URL: http://localhost:3001"
echo "- Frontend URL: http://localhost:3000"
echo "- API Documentation: http://localhost:3001/api"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Ensure database migrations are run in Supabase Dashboard"
echo "2. Create a test user through the registration page"
echo "3. Upload a document and test course generation"

echo -e "\n${YELLOW}Common Issues:${NC}"
echo "- If backend fails: Check if it's running (cd backend && npm run dev)"
echo "- If frontend fails: Check if it's running (cd frontend && npm run dev)"
echo "- If CORS fails: Verify CORS_ALLOWED_ORIGINS in backend .env"