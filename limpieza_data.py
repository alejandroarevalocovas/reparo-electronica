import pandas as pd
import re
from datetime import datetime

# -----------------------------
# Leer CSV
# -----------------------------
df = pd.read_csv(
    "data_pedidos.csv",
    sep=";",             # Cambia a "\t" si es TSV
    encoding="utf-8",
    on_bad_lines="skip", # Ignora filas que no se puedan parsear
    skip_blank_lines=True
)
df = df.loc[:, ~df.columns.str.contains("Unnamed")]
df = df.dropna(how="all")
df = df.fillna("")
# -----------------------------
# Función para convertir fechas
# -----------------------------
def parse_date(date_str):
    if pd.isna(date_str):
        return None
    date_str = str(date_str).strip()
    try:
        if "/" in date_str:
            d = datetime.strptime(date_str, "%d/%m/%Y")
        elif "." in date_str:
            d = datetime.strptime(date_str, "%d.%m.%y")
        else:
            d = datetime.strptime(date_str, "%Y-%m-%d")
        return d.strftime("%Y-%m-%d")
    except:
        return None

# Formatear fechas
df['fecha_entrada'] = df['fecha_entrada'].apply(parse_date)
df['fecha_reparacion'] = df['fecha_reparacion'].apply(parse_date)
df['fecha_pagado'] = df['fecha_pagado'].apply(parse_date)

# -----------------------------
# Separar columna equipo
# -----------------------------
def parse_equipo(equipo_str):
    # Si es NaN o vacío
    if pd.isna(equipo_str) or str(equipo_str).strip() == "":
        return pd.Series([None, None, None, None])  # siempre 4 valores
    equipo_str = equipo_str.strip()
    # Tipo: Reparar, Comparar o Reclamacion
    tipo_match = re.match(r"^(Reparar|Comparar|Reclamacion)", equipo_str)
    tipo = tipo_match.group(0) if tipo_match else None
    # Parte de equipo: desde la palabra hasta " de"
    equipo_match = re.match(r"^(Reparar|Comparar|Reclamacion).*? de", equipo_str)
    equipo = equipo_match.group(0)[:-3] if equipo_match else None
    # Cliente: desde "de" hasta "(" si hay
    cliente_match = re.search(r"de\s+(.*?)(\(|$)", equipo_str)
    cliente = cliente_match.group(1).strip() if cliente_match else None
    # Localización: dentro de paréntesis
    loc_match = re.search(r"\((.*?)\)", equipo_str)
    localizacion = loc_match.group(1).strip() if loc_match else None
    return pd.Series([tipo, equipo, cliente, localizacion])


df[['tipo', 'equipo_limpio', 'cliente', 'localizacion']] = df['equipo'].apply(parse_equipo)

df_valid = df[df['valido'] == True].copy()
df_invalid = df[df['valido'] == False].copy()
# -----------------------------
# Mantener columnas finales
# -----------------------------
df_final = df[['fecha_entrada', 'equipo_limpio', 'tipo', 'cliente', 'localizacion', 
               'problema', 'estado', 'fecha_reparacion', 'fecha_pagado', 'precio', 'comentarios']]

# Renombrar columnas para coincidir con la tabla PostgreSQL
df_final = df_final.rename(columns={
    'equipo_limpio': 'equipo',
    'Problema': 'problema',
    'Estado': 'estado',
    'Precio': 'precio',
    'Comentarios': 'comentarios'
})

# -----------------------------
# Formatear precio: "30,00 €" → 30.00
# -----------------------------
def parse_price(p):
    if pd.isna(p):
        return None
    p = str(p).replace("€","").replace(",",".").strip()
    try:
        return float(p)
    except:
        return None

df_final['precio'] = df_final['precio'].apply(parse_price)

# -----------------------------
# Guardar CSV listo para PostgreSQL
# -----------------------------
df_final.to_csv("pedidos_formateado.csv", index=False)
print("CSV formateado listo: pedidos_formateado.csv")
