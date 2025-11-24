#!/bin/bash

# ══════════════════════════════════════════════════════════
# SYSTEM HEALTH CHECK SCRIPT
# Project: GiaoBanBV
# Author: Auto-generated
# Date: 2025-11-16
# ══════════════════════════════════════════════════════════

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔍 KIỂM TRA HỆ THỐNG - $(date)"
echo "=========================================="

echo ""
echo "📊 THÔNG TIN SERVER:"
echo "--------------------"
echo "Uptime: $(uptime -p)"
OS_NAME=$(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
echo "OS: $OS_NAME"
CPU_NAME=$(lscpu | grep 'Model name' | cut -d':' -f2 | xargs)
echo "CPU: $CPU_NAME"
echo ""

echo "💾 TÀI NGUYÊN:"
echo "--------------------"

# Memory
MEM_INFO=$(free -h | grep -E 'Mem|Swap')
echo "$MEM_INFO"

# Check if memory is low
MEM_AVAILABLE=$(free -m | grep Mem | awk '{print $7}')
if [ $MEM_AVAILABLE -lt 500 ]; then
    echo -e "${RED}⚠️  CẢNH BÁO: RAM khả dụng < 500MB${NC}"
fi

echo ""

# Disk
DISK_INFO=$(df -h / | tail -1)
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "$DISK_INFO"

if [ $DISK_USAGE -gt 90 ]; then
    echo -e "${RED}⚠️  NGUY HIỂM: Disk usage > 90%${NC}"
elif [ $DISK_USAGE -gt 80 ]; then
    echo -e "${YELLOW}⚠️  CẢNH BÁO: Disk usage > 80%${NC}"
fi

echo ""
echo "🚀 SERVICES STATUS:"
echo "--------------------"

# Check PM2
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list 2>/dev/null | grep -q "online")
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend (PM2): Running${NC}"
    else
        echo -e "${RED}❌ Backend (PM2): STOPPED or ERRORED${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not found${NC}"
fi

# Check MongoDB
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB: Running${NC}"
else
    echo -e "${RED}❌ MongoDB: STOPPED${NC}"
fi

echo ""
echo "🌐 NETWORK & PORTS:"
echo "--------------------"

# Check ports
PORTS=("3000:Backend" "27017:MongoDB")
for PORT_INFO in "${PORTS[@]}"; do
    IFS=':' read -r PORT NAME <<< "$PORT_INFO"
    if sudo ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
        echo -e "${GREEN}✅ Port $PORT ($NAME): Open${NC}"
    else
        echo -e "${RED}❌ Port $PORT ($NAME): NOT listening${NC}"
    fi
done

echo ""
echo "🏥 HEALTH CHECK:"
echo "--------------------"

# Check Backend API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend API: Healthy (HTTP $HTTP_CODE)${NC}"
else
    if [ -z "$HTTP_CODE" ]; then
        echo -e "${RED}❌ Backend API: Not responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend API: HTTP $HTTP_CODE${NC}"
    fi
fi

echo ""
echo "📋 PM2 APPS:"
echo "--------------------"
if command -v pm2 &> /dev/null; then
    pm2 list 2>/dev/null | grep -E "name|─────"
else
    echo "PM2 not installed"
fi

echo ""
echo "🔍 RECENT ERRORS (PM2):"
echo "--------------------"
if command -v pm2 &> /dev/null; then
    ERRORS=$(pm2 logs giaobanbv-be --err --lines 3 --nostream 2>/dev/null)
    if [ -z "$ERRORS" ]; then
        echo -e "${GREEN}No recent errors${NC}"
    else
        echo "$ERRORS"
    fi
else
    echo "PM2 not installed"
fi

echo ""
echo "=========================================="

# Summary
ISSUES=0

if [ $MEM_AVAILABLE -lt 500 ]; then
    ISSUES=$((ISSUES + 1))
fi

if [ $DISK_USAGE -gt 80 ]; then
    ISSUES=$((ISSUES + 1))
fi

if ! systemctl is-active --quiet mongod 2>/dev/null; then
    ISSUES=$((ISSUES + 1))
fi

if [ "$HTTP_CODE" != "200" ]; then
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Kiểm tra hoàn tất! Không có vấn đề.${NC}"
else
    echo -e "${YELLOW}⚠️  Phát hiện $ISSUES vấn đề. Vui lòng kiểm tra!${NC}"
fi

echo "=========================================="
