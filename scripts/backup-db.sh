#!/bin/bash

# Backup Script - Kolink Database
# Creates compressed backup of Supabase PostgreSQL database

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    brew install supabase/tap/supabase
fi

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔄 Creating database backup...${NC}"
echo -e "   Timestamp: $DATE"

# Backup usando supabase db dump
supabase db dump --linked > "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Backup completed with warnings${NC}"
fi

# Comprimir
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip "$BACKUP_FILE"

echo -e "${GREEN}✅ Backup compressed${NC}"
echo -e "   File: $BACKUP_FILE.gz"
echo -e "   Size: $(du -h "$BACKUP_FILE.gz" | cut -f1)"

# Limpiar backups antiguos (mantener últimos 7)
echo -e "${BLUE}🧹 Cleaning old backups...${NC}"
BACKUP_COUNT=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt 7 ]; then
    REMOVED=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +8 | xargs rm -f)
    echo -e "${GREEN}✅ Removed $(($BACKUP_COUNT - 7)) old backup(s)${NC}"
else
    echo -e "${GREEN}✅ No old backups to remove (keeping 7)${NC}"
fi

# Listar backups disponibles
echo ""
echo -e "${GREEN}📦 Available backups:${NC}"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -n 7 | awk '{print "   "$9" ("$5")"}'

echo ""
echo -e "${GREEN}✅ Backup complete!${NC}"
echo -e "   To restore: gunzip $BACKUP_FILE.gz && supabase db reset --linked < $BACKUP_FILE"
