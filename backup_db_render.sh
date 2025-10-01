
#!/bin/bash

# =============================
# Configuración
# =============================

# URL de conexión a la DB de Render
DB_URL="postgresql://reparo_electronica_db_user:e02ASAGPUbVg8fpWLFNj77qkmtyZel1s@dpg-d398jms9c44c73anjpjg-a.frankfurt-postgres.render.com/reparo_electronica_db"
# Nombre remoto de Google Drive en rclone (el que configuraste)
REMOTE_DRIVE="gdrive:Reparo_electronica"

# Prefijo del archivo de backup
BACKUP_PREFIX="rep_elect"

# Número de días de historial a mantener
DAYS_TO_KEEP=7

# Fecha actual
TODAY=$(date +'%Y-%m-%d')

# Nombre del archivo
BACKUP_FILE="${BACKUP_PREFIX}_${TODAY}.sql"

# Carpeta temporal local
TMP_DIR="/tmp/backups_render"
mkdir -p "$TMP_DIR"

# =============================
# Hacer backup
# =============================
echo "[$(date)] Creando backup de la base de datos..."
pg_dump "$DB_URL" -F c -f "$TMP_DIR/$BACKUP_FILE"
if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Falló el backup de la DB"
    exit 1
fi
echo "[$(date)] Backup creado: $BACKUP_FILE"

# =============================
# Subir a Google Drive
# =============================
echo "[$(date)] Subiendo backup a Google Drive..."
rclone copy "$TMP_DIR/$BACKUP_FILE" "$REMOTE_DRIVE/" --progress
if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Falló la subida a Google Drive"
    exit 1
fi
echo "[$(date)] Backup subido correctamente"

# =============================
# Limpiar backups antiguos en Drive
# =============================
echo "[$(date)] Limpiando backups antiguos en Drive..."
# Listar archivos en Drive con prefijo BACKUP_PREFIX y ordenar por fecha
OLD_FILES=$(rclone lsf "$REMOTE_DRIVE/" --include "${BACKUP_PREFIX}_*.sql" --sort name)
for file in $OLD_FILES; do
    # Extraer fecha del nombre
    FILE_DATE=$(echo "$file" | sed -E "s/${BACKUP_PREFIX}_([0-9]{4}-[0-9]{2}-[0-9]{2})\.sql/\1/")
    FILE_SECONDS=$(date -d "$FILE_DATE" +%s)
    TODAY_SECONDS=$(date -d "$TODAY" +%s)
    DIFF_DAYS=$(( (TODAY_SECONDS - FILE_SECONDS) / 86400 ))
    if [ "$DIFF_DAYS" -gt "$DAYS_TO_KEEP" ]; then
        echo "[$(date)] Eliminando backup antiguo: $file"
        rclone delete "$REMOTE_DRIVE/$file"
    fi
done

# =============================
# Limpiar temporal local
# =============================
rm -f "$TMP_DIR/$BACKUP_FILE"
