#!/bin/bash
set -e  # Detener el script si hay algún error

# =============================
# Configuración
# =============================
DB_URL="${DB_URL}"                       # Viene del secret de GitHub Actions
REMOTE_DRIVE="${REMOTE_DRIVE}"           # Viene del secret de GitHub Actions
BACKUP_DIR="/tmp/backups"                # Carpeta temporal local en Actions
RETENTION_DAYS=7                          # Cuántos días mantener

# Crear carpeta temporal si no existe
mkdir -p "$BACKUP_DIR"

# Nombre del backup con fecha
DATE=$(date +'%Y-%m-%d')
BACKUP_FILE="$BACKUP_DIR/rep_elect_$DATE.sql"

# =============================
# Crear backup
# =============================
echo "[$(date)] Creando backup de la base de datos..."
pg_dump "$DB_URL" > "$BACKUP_FILE"
echo "[$(date)] Backup generado: $BACKUP_FILE"

# =============================
# Subir a Google Drive
# =============================
echo "[$(date)] Subiendo backup a Google Drive..."
rclone copy "$BACKUP_FILE" "$REMOTE_DRIVE" --progress
echo "[$(date)] Backup subido correctamente"

# =============================
# Limpiar backup local
# =============================
rm -f "$BACKUP_FILE"
echo "[$(date)] Backup temporal local eliminado"

# =============================
# Limpiar backups antiguos en Drive
# =============================
echo "[$(date)] Eliminando backups antiguos (> $RETENTION_DAYS días)..."
rclone delete --min-age ${RETENTION_DAYS}d "$REMOTE_DRIVE"
echo "[$(date)] Backups antiguos eliminados"

echo "[$(date)] Backup completado y enviado a Drive correctamente."
