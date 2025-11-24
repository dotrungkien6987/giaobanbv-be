#!/bin/bash

# ══════════════════════════════════════════════════════════
# MONGODB BACKUP SCRIPT
# Project: GiaoBanBV
# Author: Auto-generated
# Date: 2025-11-16
# ══════════════════════════════════════════════════════════

# ════════════════════════════════════
# CONFIGURATION
# ════════════════════════════════════

# Backup directory
BACKUP_DIR=~/backups/mongodb

# Database name
DB_NAME="giaobanbv"

# Retention days (xóa backups cũ hơn X ngày)
RETENTION_DAYS=7

# MongoDB authentication (để trống nếu chưa có auth)
MONGO_USER=""
MONGO_PASS=""
MONGO_AUTH_DB="admin"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

check_mongodb() {
    if ! systemctl is-active --quiet mongod; then
        log_error "MongoDB is not running!"
        exit 1
    fi
}

# ════════════════════════════════════
# MAIN SCRIPT
# ════════════════════════════════════

echo "════════════════════════════════════════════════════════"
echo "🔄 MONGODB BACKUP SCRIPT"
echo "════════════════════════════════════════════════════════"
echo ""

# Check MongoDB is running
log_info "Checking MongoDB status..."
check_mongodb
log_info "MongoDB is running ✓"
echo ""

# Create backup directory if not exists
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.gz"

# Start backup
log_info "Starting backup of database: $DB_NAME"
log_info "Backup file: $BACKUP_FILE"
echo ""

# Build mongodump command
MONGODUMP_CMD="mongodump --db $DB_NAME --gzip --archive=$BACKUP_FILE"

# Add authentication if configured
if [ ! -z "$MONGO_USER" ] && [ ! -z "$MONGO_PASS" ]; then
    MONGODUMP_CMD="$MONGODUMP_CMD -u $MONGO_USER -p $MONGO_PASS --authenticationDatabase $MONGO_AUTH_DB"
fi

# Run backup
START_TIME=$(date +%s)
$MONGODUMP_CMD

# Check result
if [ $? -eq 0 ]; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo ""
    log_info "✅ Backup completed successfully!"
    log_info "Duration: ${DURATION}s"
    log_info "File size: $FILE_SIZE"
    log_info "Location: $BACKUP_FILE"
else
    echo ""
    log_error "❌ Backup failed!"
    exit 1
fi

echo ""

# Cleanup old backups
log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}-*.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ $DELETED_COUNT -gt 0 ]; then
    log_info "Deleted $DELETED_COUNT old backup(s)"
else
    log_info "No old backups to delete"
fi

echo ""

# List recent backups
log_info "Recent backups:"
ls -lh "$BACKUP_DIR/${DB_NAME}-"*.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Backup process completed!"
echo "════════════════════════════════════════════════════════"
