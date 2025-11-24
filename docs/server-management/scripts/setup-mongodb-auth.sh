#!/bin/bash

# ══════════════════════════════════════════════════════════
# MONGODB AUTHENTICATION SETUP SCRIPT
# Project: GiaoBanBV
# Author: Auto-generated
# Date: 2025-11-16
# ⚠️  IMPORTANT: Run this script to secure your MongoDB
# ══════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_NAME="giaobanbv"
APP_DIR=~/giaobanbv-be

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

# ════════════════════════════════════
# MAIN SCRIPT
# ════════════════════════════════════

clear
echo "════════════════════════════════════════════════════════"
echo "🔐 MONGODB AUTHENTICATION SETUP"
echo "════════════════════════════════════════════════════════"
echo ""
log_warning "This script will:"
log_warning "1. Create admin user for MongoDB"
log_warning "2. Create application user for database"
log_warning "3. Enable authentication in MongoDB config"
log_warning "4. Restart MongoDB service"
log_warning "5. Update your application connection string"
echo ""
read -p "❓ Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Setup cancelled"
    exit 0
fi

# ════════════════════════════════════
# STEP 1: CHECK PREREQUISITES
# ════════════════════════════════════

log_step "STEP 1: Checking Prerequisites"

# Check MongoDB is running
if ! systemctl is-active --quiet mongod; then
    log_error "MongoDB is not running!"
    log_info "Starting MongoDB..."
    sudo systemctl start mongod
    sleep 3
fi

# Check mongosh is installed
if ! command -v mongosh &> /dev/null; then
    log_error "mongosh not found!"
    log_info "Please install MongoDB Shell: https://www.mongodb.com/try/download/shell"
    exit 1
fi

log_info "✅ All prerequisites met"

# ════════════════════════════════════
# STEP 2: COLLECT PASSWORDS
# ════════════════════════════════════

log_step "STEP 2: Set Passwords"

echo ""
log_info "Please enter passwords (minimum 12 characters recommended)"
echo ""

# Admin password
while true; do
    read -s -p "🔑 Admin password: " ADMIN_PASS
    echo ""
    read -s -p "🔑 Confirm admin password: " ADMIN_PASS_CONFIRM
    echo ""
    
    if [ "$ADMIN_PASS" = "$ADMIN_PASS_CONFIRM" ]; then
        if [ ${#ADMIN_PASS} -lt 8 ]; then
            log_warning "Password too short! Use at least 8 characters."
        else
            break
        fi
    else
        log_error "Passwords don't match! Try again."
    fi
done

echo ""

# App password
while true; do
    read -s -p "🔑 App user password: " APP_PASS
    echo ""
    read -s -p "🔑 Confirm app password: " APP_PASS_CONFIRM
    echo ""
    
    if [ "$APP_PASS" = "$APP_PASS_CONFIRM" ]; then
        if [ ${#APP_PASS} -lt 8 ]; then
            log_warning "Password too short! Use at least 8 characters."
        else
            break
        fi
    else
        log_error "Passwords don't match! Try again."
    fi
done

log_info "✅ Passwords set"

# ════════════════════════════════════
# STEP 3: CREATE ADMIN USER
# ════════════════════════════════════

log_step "STEP 3: Creating Admin User"

mongosh --eval "
use admin;
db.createUser({
  user: 'admin',
  pwd: '$ADMIN_PASS',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' },
    { role: 'clusterAdmin', db: 'admin' }
  ]
});
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log_info "✅ Admin user created"
else
    log_warning "Admin user may already exist (this is OK)"
fi

# ════════════════════════════════════
# STEP 4: CREATE APP USER
# ════════════════════════════════════

log_step "STEP 4: Creating Application User"

mongosh --eval "
use $DB_NAME;
db.createUser({
  user: 'giaobanbv_app',
  pwd: '$APP_PASS',
  roles: [
    { role: 'readWrite', db: '$DB_NAME' }
  ]
});
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log_info "✅ Application user created"
else
    log_warning "Application user may already exist (this is OK)"
fi

# ════════════════════════════════════
# STEP 5: ENABLE AUTHENTICATION
# ════════════════════════════════════

log_step "STEP 5: Enabling Authentication"

# Backup config
sudo cp /etc/mongod.conf /etc/mongod.conf.backup.$(date +%Y%m%d-%H%M%S)
log_info "✅ Config backed up"

# Check if security section exists
if grep -q "^security:" /etc/mongod.conf; then
    log_info "Security section already exists"
    # Update existing section
    sudo sed -i 's/^#*\s*authorization:.*/  authorization: enabled/' /etc/mongod.conf
else
    # Add security section
    echo "" | sudo tee -a /etc/mongod.conf
    echo "security:" | sudo tee -a /etc/mongod.conf
    echo "  authorization: enabled" | sudo tee -a /etc/mongod.conf
fi

log_info "✅ Authentication enabled in config"

# ════════════════════════════════════
# STEP 6: RESTART MONGODB
# ════════════════════════════════════

log_step "STEP 6: Restarting MongoDB"

sudo systemctl restart mongod
sleep 3

if systemctl is-active --quiet mongod; then
    log_info "✅ MongoDB restarted successfully"
else
    log_error "❌ MongoDB failed to start!"
    log_info "Restoring backup config..."
    sudo cp /etc/mongod.conf.backup.* /etc/mongod.conf
    sudo systemctl restart mongod
    exit 1
fi

# ════════════════════════════════════
# STEP 7: TEST AUTHENTICATION
# ════════════════════════════════════

log_step "STEP 7: Testing Authentication"

# Test without auth (should fail)
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    log_error "❌ Authentication not working! Anyone can connect without password."
    exit 1
else
    log_info "✅ Anonymous access blocked (good!)"
fi

# Test with auth (should work)
if mongosh -u admin -p "$ADMIN_PASS" --authenticationDatabase admin --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    log_info "✅ Admin user authentication works"
else
    log_error "❌ Admin authentication failed!"
    exit 1
fi

# Test app user
if mongosh -u giaobanbv_app -p "$APP_PASS" --authenticationDatabase $DB_NAME $DB_NAME --eval "db.getCollectionNames()" > /dev/null 2>&1; then
    log_info "✅ App user authentication works"
else
    log_error "❌ App user authentication failed!"
    exit 1
fi

# ════════════════════════════════════
# STEP 8: UPDATE APPLICATION CONFIG
# ════════════════════════════════════

log_step "STEP 8: Update Application Config"

CONNECTION_STRING="mongodb://giaobanbv_app:$APP_PASS@localhost:27017/$DB_NAME?authSource=$DB_NAME"

log_info "New connection string:"
echo ""
echo "  $CONNECTION_STRING"
echo ""

log_warning "⚠️  You need to update your application's .env file manually!"
echo ""
echo "Steps:"
echo "  1. Edit $APP_DIR/.env"
echo "  2. Update MONGODB_URI to:"
echo "     MONGODB_URI=$CONNECTION_STRING"
echo "  3. Restart PM2 app: pm2 restart giaobanbv-be"
echo ""

read -p "❓ Open .env file now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$APP_DIR/.env" ]; then
        nano "$APP_DIR/.env"
    else
        log_warning ".env file not found at $APP_DIR/.env"
    fi
fi

# ════════════════════════════════════
# COMPLETION SUMMARY
# ════════════════════════════════════

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ MONGODB AUTHENTICATION SETUP COMPLETED!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📋 What was done:"
echo "  ✅ Admin user created (username: admin)"
echo "  ✅ App user created (username: giaobanbv_app)"
echo "  ✅ Authentication enabled in MongoDB"
echo "  ✅ MongoDB restarted"
echo "  ✅ Authentication tested and working"
echo ""
echo "📝 Important passwords (SAVE THESE SECURELY):"
echo "  • Admin password: [you entered it]"
echo "  • App password: [you entered it]"
echo ""
echo "⚠️  NEXT STEPS:"
echo "  1. Update .env file with new connection string"
echo "  2. Restart application: pm2 restart giaobanbv-be"
echo "  3. Test application: curl http://localhost:3000/api/health"
echo ""
echo "🔐 Security tips:"
echo "  • Never commit passwords to Git"
echo "  • Store passwords in a password manager"
echo "  • Backup /etc/mongod.conf is at: /etc/mongod.conf.backup.*"
echo ""
echo "════════════════════════════════════════════════════════"
