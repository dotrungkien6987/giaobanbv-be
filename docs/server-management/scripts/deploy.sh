#!/bin/bash

# ══════════════════════════════════════════════════════════
# DEPLOYMENT SCRIPT
# Project: GiaoBanBV Backend
# Author: Auto-generated
# Date: 2025-11-16
# ══════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR=~/giaobanbv-be
APP_NAME="giaobanbv-be"
BRANCH="main"

# ════════════════════════════════════
# FUNCTIONS
# ════════════════════════════════════

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Confirm action
confirm() {
    read -p "❓ $1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Deployment cancelled by user"
        exit 0
    fi
}

# ════════════════════════════════════
# PRE-DEPLOYMENT CHECKS
# ════════════════════════════════════

echo "════════════════════════════════════════════════════════"
echo "🚀 DEPLOYMENT SCRIPT - $(date)"
echo "════════════════════════════════════════════════════════"
echo ""

log_info "Project: $PROJECT_DIR"
log_info "Branch: $BRANCH"
log_info "App: $APP_NAME"
echo ""

# Check if in project directory
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Check Git
if ! command_exists git; then
    log_error "Git is not installed!"
    exit 1
fi

# Check PM2
if ! command_exists pm2; then
    log_error "PM2 is not installed!"
    exit 1
fi

# Confirm deployment
confirm "Deploy to production?"

# ════════════════════════════════════
# STEP 1: BACKUP CURRENT VERSION
# ════════════════════════════════════

log_step "STEP 1: Backup Current Version"

cd "$PROJECT_DIR" || exit 1

# Get current git commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
log_info "Current commit: $CURRENT_COMMIT"

# Backup MongoDB (optional)
read -p "❓ Backup MongoDB before deploy? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Running MongoDB backup..."
    if [ -f ~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh ]; then
        bash ~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh
    else
        log_warning "Backup script not found, skipping..."
    fi
fi

# ════════════════════════════════════
# STEP 2: PULL LATEST CODE
# ════════════════════════════════════

log_step "STEP 2: Pull Latest Code"

# Fetch updates
log_info "Fetching from origin..."
git fetch origin

# Check for changes
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    log_warning "Already up to date. No changes to deploy."
    exit 0
fi

# Pull changes
log_info "Pulling changes from $BRANCH..."
git pull origin $BRANCH

if [ $? -ne 0 ]; then
    log_error "Git pull failed! Please resolve conflicts manually."
    exit 1
fi

NEW_COMMIT=$(git rev-parse --short HEAD)
log_info "New commit: $NEW_COMMIT"

# ════════════════════════════════════
# STEP 3: INSTALL DEPENDENCIES
# ════════════════════════════════════

log_step "STEP 3: Install Dependencies"

if [ -f "package-lock.json" ]; then
    log_info "Running npm ci (clean install)..."
    npm ci --production
else
    log_info "Running npm install..."
    npm install --production
fi

if [ $? -ne 0 ]; then
    log_error "npm install failed!"
    log_warning "Rolling back..."
    git reset --hard $CURRENT_COMMIT
    exit 1
fi

# ════════════════════════════════════
# STEP 4: RUN MIGRATIONS (if any)
# ════════════════════════════════════

log_step "STEP 4: Database Migrations"

if [ -f "package.json" ] && grep -q "\"migrate\"" package.json; then
    log_info "Running database migrations..."
    npm run migrate
    
    if [ $? -ne 0 ]; then
        log_error "Migration failed!"
        log_warning "Rolling back code..."
        git reset --hard $CURRENT_COMMIT
        npm ci --production
        exit 1
    fi
else
    log_info "No migrations to run"
fi

# ════════════════════════════════════
# STEP 5: RESTART APPLICATION
# ════════════════════════════════════

log_step "STEP 5: Restart Application"

# Check if PM2 app exists
if ! pm2 list | grep -q "$APP_NAME"; then
    log_error "PM2 app '$APP_NAME' not found!"
    log_info "Starting new instance..."
    pm2 start ecosystem.config.js
else
    log_info "Restarting PM2 app..."
    pm2 restart $APP_NAME
fi

# Wait for app to start
sleep 3

# ════════════════════════════════════
# STEP 6: POST-DEPLOYMENT CHECKS
# ════════════════════════════════════

log_step "STEP 6: Post-Deployment Checks"

# Check PM2 status
PM2_STATUS=$(pm2 list | grep "$APP_NAME" | grep "online")
if [ -z "$PM2_STATUS" ]; then
    log_error "❌ App is not running!"
    log_info "Checking logs..."
    pm2 logs $APP_NAME --err --lines 20
    exit 1
else
    log_info "✅ App is running"
fi

# Health check API
log_info "Testing API health..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_CODE" = "200" ]; then
    log_info "✅ API is healthy (HTTP $HTTP_CODE)"
else
    log_error "❌ API health check failed (HTTP $HTTP_CODE)"
    log_info "Checking logs..."
    pm2 logs $APP_NAME --err --lines 20
    exit 1
fi

# Check for errors in logs
log_info "Checking recent logs..."
pm2 logs $APP_NAME --lines 10 --nostream

# Save PM2 process list
pm2 save

# ════════════════════════════════════
# DEPLOYMENT SUMMARY
# ════════════════════════════════════

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "  • Previous commit: $CURRENT_COMMIT"
echo "  • New commit:      $NEW_COMMIT"
echo "  • Branch:          $BRANCH"
echo "  • Deployed at:     $(date)"
echo ""
echo "🔍 Next steps:"
echo "  1. Monitor logs: pm2 logs $APP_NAME"
echo "  2. Check metrics: pm2 monit"
echo "  3. Test endpoints manually"
echo ""
echo "════════════════════════════════════════════════════════"
