#!/bin/bash
set -euo pipefail

# =============================
# Configuración
# =============================

DB_URL="postgresql://reparo_electronica_db_user:e02ASAGPUbVg8fpWLFNj77qkmtyZel1s@dpg-d398jms9c44c73anjpjg-a.frankfurt-postgres.render.com/reparo_electronica_db"
REMOTE_DRIVE="gdrive:Reparo_electronica"
BACKUP_PREFIX="rep_elect"
DAYS_TO_KEEP=7
TODAY=$(date +'%Y-%m-%d')

TMP_DIR="/tmp/backups_render"
mkdir -p "$TMP_DIR"

BACKUP_FILE="${BACKUP_PREFIX}_${TODAY}.sql.gz"

# Log a stdout + archivo
LOGFILE="/tmp/backup_${TODAY}.log"
exec > >(tee -a "$LOGFILE") 2>&1

echo "[$(date)] === Iniciando backup ==="

# =============================
# Hacer backup comprimido
# =============================
echo "[$(date)] Creando backup de la base de datos..."
if ! pg_dump "$DB_URL" -F p | gzip > "$TMP_DIR/$BACKUP_FILE"; then
  echo "[$(date)] ERROR: Falló el backup de la DB"
  exit 1
fi
echo "[$(date)] Backup creado: $BACKUP_FILE"

# =============================
# Subir a Google Drive
# =============================
echo "[$(date)] Subiendo backup a Google Drive..."
if ! rclone copy "$TMP_DIR/$BACKUP_FILE" "$REMOTE_DRIVE/" --progress; then
  echo "[$(date)] ERROR: Falló la subida a Google Drive"
  exit 1
fi
echo "[$(date)] Backup subido correctamente"

# =============================
# Limpiar backups antiguos en Drive
# =============================
echo "[$(date)] Eliminando backups más antiguos de $DAYS_TO_KEEP días..."
rclone delete --min-age ${DAYS_TO_KEEP}d "$REMOTE_DRIVE/"
echo "[$(date)] Limpieza remota completada"

# =============================
# Subir log (opcional)
# =============================
rclone copy "$LOGFILE" "$REMOTE_DRIVE/logs/" || true

# =============================
# Limpiar temporal local
# =============================
rm -f "$TMP_DIR/$BACKUP_FILE" "$LOGFILE"

echo "[$(date)] === Backup finalizado con éxito ==="

