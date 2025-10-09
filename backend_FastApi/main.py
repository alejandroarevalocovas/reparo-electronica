# main.py
# uvicorn main:app --reload

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Date, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from sqlalchemy.dialects.postgresql import JSONB
from passlib.hash import bcrypt
from pydantic import BaseModel
from typing import Optional, List, Dict
import yaml
from pathlib import Path
from datetime import datetime, timedelta, date
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware
import os

# ---------- Cargar configuración local ----------
# config_path = Path(__file__).parent / "config.yaml"
# with open(config_path, "r") as f:
#     config = yaml.safe_load(f)

# db_conf = config["database"]

# ---------- Cargar configuración Render ----------
# DATABASE_URL = "postgresql://reparo_electronica_db_user:e02ASAGPUbVg8fpWLFNj77qkmtyZel1s@dpg-d398jms9c44c73anjpjg-a.frankfurt-postgres.render.com/reparo_electronica_db"
DATABASE_URL = os.environ.get("DATABASE_URL")
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------- TOKEN ----------
# token_conf = config["token"]
# SECRET_KEY = token_conf['secret_key']
# ALGORITHM = token_conf['algorithm']
# ACCESS_TOKEN_EXPIRE_MINUTES = token_conf['expire']
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ---------- Modelo SQLAlchemy ----------
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))

    def verify_password(self, password: str):
        return bcrypt.verify(password, self.hashed_password)

class Pedido(Base):
    __tablename__ = "pedidos"
    id = Column(Integer, primary_key=True, index=True)
    fecha_entrada = Column(Date, default=date.today, nullable=False)
    equipo = Column(Text, nullable=False)
    problema = Column(Text, nullable=False)
    estado = Column(Text, nullable=True)
    fecha_reparacion = Column(Date, nullable=True)
    fecha_pagado = Column(Date, nullable=True)
    tiempo_reparacion = Column(Integer, nullable=True)
    precio = Column(Numeric(10, 2), nullable=False)
    precio_total = Column(Numeric(10, 2), nullable=True)
    tipo_cobro = Column(Text, nullable=True)
    comentarios = Column(Text, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    numero_serie = Column(Text, nullable=False)
    part_number = Column(Text, nullable=True)
    garantia = Column(Boolean, nullable=True)
    tiempo_garantia = Column(Integer, nullable=True)
    

    cliente = relationship("Cliente")
    stocks = relationship("PedidoStock", back_populates="pedido", cascade="all, delete-orphan")

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    localizacion = Column(String(100), nullable=True)
    contacto = Column(String(100), nullable=False)
    categoria = Column(String(100), nullable=False)
    contacta_por = Column(String(100), nullable=True)

class Stock(Base):
    __tablename__ = "stock"
    id = Column(Integer, primary_key=True, index=True)
    referencia = Column(String(100), nullable=False)
    formato = Column(String(100), nullable=True)
    tipo = Column(String(100), nullable=False)
    cantidad = Column(Integer, nullable=True)
    cantidad_total = Column(Integer, nullable=False)
    ubicacion = Column(String(100), nullable=True)
    estado = Column(String(50), nullable=True)
    visto_en = Column(String(255), nullable=True)
    fecha_actual = Column(Date, nullable=True)
    comentarios = Column(Text, nullable=True)
    enlace_compra = Column(String(255), nullable=True)
    fecha_compra = Column(Date, nullable=True)
    precio = Column(Numeric(10, 2), nullable=False)
    detalles = Column(JSONB, default={}) 

    pedidos = relationship("PedidoStock", back_populates="stock", cascade="all, delete-orphan")

class PedidoStock(Base):
    __tablename__ = "pedido_stock"
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"))
    stock_id = Column(Integer, ForeignKey("stock.id"))
    cantidad_usada = Column(Integer, nullable=False)

    pedido = relationship("Pedido", back_populates="stocks")
    stock = relationship("Stock", back_populates="pedidos")

Base.metadata.create_all(bind=engine)

# ---------- Esquemas Pydantic ----------
class LoginData(BaseModel):
    username: str
    password: str

class PedidoBase(BaseModel):
    id: int
    numero_serie: str
    part_number: Optional[str] = None
    equipo: str
    fecha_entrada: date
    problema: str
    estado: Optional[str] = "pendiente"
    fecha_reparacion: Optional[date] = None
    tiempo_reparacion: Optional[int] = None
    precio: float
    precio_total: float
    pendiente_pago: Optional[float] = None
    tipo_cobro: Optional[str] = None
    fecha_pagado: Optional[date] = None
    cliente_id: int
    nombre_cliente: str
    comentarios: Optional[str] = None
    precio_stock: Optional[float] = None
    cobro_neto: Optional[float] = None
    garantia: Optional[bool] = None
    tiempo_garantia: Optional[int] = None

    class Config:
        orm_mode = True

class PedidoStockAsignacion(BaseModel):
    stock_id: int
    cantidad_usada: int

class PedidoCreate(BaseModel):
    numero_serie: str
    part_number: Optional[str] = None
    equipo: str
    fecha_entrada: date
    problema: str
    estado: Optional[str] = None
    fecha_reparacion: Optional[date] = None
    tiempo_reparacion: Optional[int] = None
    precio: float
    precio_total: float
    tipo_cobro: Optional[str] = None
    fecha_pagado: Optional[date] = None
    cliente_id: int
    comentarios: Optional[str] = None
    garantia: Optional[bool] = None
    tiempo_garantia: Optional[int] = None
    stocks: Optional[List[PedidoStockAsignacion]] = None  # <-- lista de stock al crear

class ClienteBase(BaseModel):
    id: int
    nombre: str
    localizacion: Optional[str] = None
    contacto: str
    categoria: str
    contacta_por: Optional[str] = None

    class Config:
        orm_mode = True

class ClienteCreate(BaseModel):
    nombre: str
    localizacion: Optional[str] = None
    contacto: str
    categoria: str
    contacta_por: Optional[str] = None

class StockBase(BaseModel):
    id: int
    referencia: str
    formato: Optional[str] = None
    tipo: str
    cantidad: Optional[int] = None
    cantidad_total: int
    ubicacion: Optional[str] = None
    estado: Optional[str] = None
    visto_en: Optional[str] = None
    fecha_actual: Optional[date] = None
    comentarios: Optional[str] = None
    enlace_compra: Optional[str] = None
    fecha_compra: Optional[date] = None
    precio: float
    precio_unidad: Optional[float] = None
    detalles: Optional[Dict] = {}

    class Config:
        orm_mode = True

class StockCreate(BaseModel):
    referencia: str
    formato: Optional[str] = None
    tipo: str
    cantidad: Optional[int] = None
    cantidad_total: int
    ubicacion: Optional[str] = None
    estado: Optional[str] = None
    visto_en: Optional[str] = None
    fecha_actual: Optional[date] = None
    comentarios: Optional[str] = None
    enlace_compra: Optional[str] = None
    fecha_compra: Optional[date] = None
    precio: float
    detalles: Optional[Dict] = {}

class PedidoStockResponse(BaseModel):
    referencia: str
    tipo: str | None = None
    cantidad_usada: int

    class Config:
        orm_mode = True

# ---------- Dependencia de DB ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------- Create Token ----------
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ---------- App FastAPI ----------
app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://reparo-electronica-frontend.onrender.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API de servicio técnico 🚀"}

@app.get("/ping")
@app.head("/ping")
def ping():
    return {"status": "ok"}

@app.get("/me")
def get_current_user_info(current_user: str = Depends(get_current_user)):
    return {"username": current_user}

# ---------- LOGIN ----------
@app.post("/login")
def login_json(login_data: LoginData, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not user.verify_password(login_data.password):
        raise HTTPException(status_code=401, detail="Usuario o password incorrecto")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

# ------------------------------------------ PEDIDOS ---------------------------------------------
@app.get("/pedidos/", response_model=list[dict])
def listar_pedidos(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedidos = db.query(Pedido).all()
    resultado = []

    for pedido in pedidos:
        # Precio stock acumulado
        precio_stock_total = 0
        for ps in pedido.stocks:  # relación PedidoStock
            if ps.stock and ps.stock.precio and ps.stock.cantidad_total:
                precio_unitario = float(ps.stock.precio) / ps.stock.cantidad_total
                precio_stock_total += precio_unitario * ps.cantidad_usada

        row = {
            "id": pedido.id,
            "fecha_entrada": pedido.fecha_entrada,
            "equipo": pedido.equipo,
            "problema": pedido.problema,
            "estado": pedido.estado,
            "fecha_reparacion": pedido.fecha_reparacion,
            "fecha_pagado": pedido.fecha_pagado,
            "tiempo_reparacion": pedido.tiempo_reparacion,
            "precio": float(pedido.precio) if pedido.precio else None,
            "precio_total": float(pedido.precio_total) if pedido.precio_total else None,
            "pendiente_pago": round(
                (float(pedido.precio_total) if pedido.precio_total else 0) - float(pedido.precio), 2
            ),
            "tipo_cobro": pedido.tipo_cobro,
            "comentarios": pedido.comentarios,
            "cliente_id": pedido.cliente_id,
            "numero_serie": pedido.numero_serie,
            "part_number": pedido.part_number,
            "garantia": pedido.garantia,
            "tiempo_garantia": pedido.tiempo_garantia,
            "precio_stock": round(precio_stock_total, 2),
            "cobro_neto": round(
                (float(pedido.precio) if pedido.precio else 0) - precio_stock_total, 2
            ),
        }
        resultado.append(row)

    return resultado

@app.get("/pedido_stock/{pedido_id}", response_model=List[PedidoStockResponse])
def get_stock_pedido(pedido_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    resultados = (
        db.query(
            Stock.referencia.label("referencia"),
            Stock.tipo.label("tipo"),
            PedidoStock.cantidad_usada.label("cantidad_usada")
        )
        .join(Stock, PedidoStock.stock_id == Stock.id)
        .filter(PedidoStock.pedido_id == pedido_id)
        .all()
    )
    stock_list = [
        {"referencia": r.referencia, "tipo": r.tipo, "cantidad_usada": r.cantidad_usada}
        for r in resultados
    ]
    return stock_list

def procesar_stock_pedido(pedido_id: int, asignaciones: List[PedidoStockAsignacion], db: Session):
    # Obtener asignaciones actuales del pedido
    stock_actual = db.query(PedidoStock).filter(PedidoStock.pedido_id == pedido_id).all()
    stock_actual_map = {s.stock_id: s for s in stock_actual}
    nuevos_ids = {s.stock_id for s in asignaciones}

    # Revertir cantidades de stock que se eliminaron del pedido
    for s_actual in stock_actual:
        if s_actual.stock_id not in nuevos_ids:
            stock_item = db.query(Stock).filter(Stock.id == s_actual.stock_id).first()
            if stock_item:
                stock_item.cantidad = (stock_item.cantidad or 0) + s_actual.cantidad_usada
                stock_item.fecha_actual = date.today()  # Solo actualizamos el stock modificado
            db.delete(s_actual)
    db.commit()

    # Insertar o actualizar asignaciones
    for asign in asignaciones:
        stock_item = db.query(Stock).filter(Stock.id == asign.stock_id).first()
        if not stock_item:
            raise HTTPException(status_code=404, detail=f"Stock {asign.stock_id} no encontrado")
        
        cantidad_anterior = stock_actual_map.get(asign.stock_id).cantidad_usada if asign.stock_id in stock_actual_map else 0
        diferencia = asign.cantidad_usada - cantidad_anterior

        if diferencia != 0:  # Solo modificamos si hay un cambio real
            if stock_item.cantidad is None:
                stock_item.cantidad = 0
            if diferencia > stock_item.cantidad:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No hay suficiente stock de {stock_item.referencia} (disponible: {stock_item.cantidad})"
                )

            # Actualizar cantidad y fecha_actual solo si hay diferencia
            stock_item.cantidad -= diferencia
            stock_item.fecha_actual = date.today()

        if asign.stock_id in stock_actual_map:
            stock_actual_map[asign.stock_id].cantidad_usada = asign.cantidad_usada
        else:
            # Nuevo stock asignado
            nuevo = PedidoStock(pedido_id=pedido_id, stock_id=asign.stock_id, cantidad_usada=asign.cantidad_usada)
            db.add(nuevo)

    db.commit()

@app.post("/pedido_stock/{pedido_id}", response_model=List[PedidoStockAsignacion])
def asignar_stock_pedido(pedido_id: int, asignaciones: List[PedidoStockAsignacion], db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    procesar_stock_pedido(pedido_id, asignaciones, db)
    return asignaciones

@app.post("/pedidos/", response_model=dict)
def crear_pedido(pedido: PedidoCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    db_pedido = Pedido(**pedido.dict(exclude={"stocks"}))
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    if pedido.stocks:
        procesar_stock_pedido(db_pedido.id, pedido.stocks, db)
    return {"message": "Pedido creado correctamente", "pedido_id": db_pedido.id}

@app.put("/pedidos/{pedido_id}", response_model=dict)
def actualizar_pedido(pedido_id: int, pedido_data: PedidoCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    for key, value in pedido_data.dict(exclude={"stocks"}).items():
        setattr(pedido, key, value)
    db.commit()
    db.refresh(pedido)
    if pedido_data.stocks:
        procesar_stock_pedido(pedido_id, pedido_data.stocks, db)
    return {"message": "Pedido actualizado correctamente"}

@app.delete("/pedidos/{pedido_id}")
def eliminar_pedido(pedido_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    # Revertir stock usado
    for ps in pedido.stocks:
        stock_item = db.query(Stock).filter(Stock.id == ps.stock_id).first()
        if stock_item:
            stock_item.cantidad = (stock_item.cantidad or 0) + ps.cantidad_usada
    db.delete(pedido)
    db.commit()
    return {"message": "Pedido eliminado"}

# ------------------------------------------ CLIENTES ---------------------------------------------
@app.get("/clientes/", response_model=list[ClienteBase])
def listar_clientes(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    clientes = db.query(Cliente).all()
    return clientes

@app.post("/clientes/", response_model=ClienteBase)
def crear_cliente(cliente: ClienteCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    nuevo_cliente = Cliente(**cliente.dict())
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente

@app.put("/clientes/{cliente_id}", response_model=ClienteBase)
def editar_cliente(cliente_id: int, cliente: ClienteCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for key, value in cliente.dict(exclude_unset=True).items():
        setattr(db_cliente, key, value)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.delete("/clientes/{cliente_id}", response_model=dict)
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente eliminado correctamente"}

# ------------------------------------------ STOCK ---------------------------------------------
@app.get("/stock/", response_model=list[dict])
def listar_stock(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    query = db.query(
        Stock.id,
        Stock.referencia,
        Stock.formato,
        Stock.tipo,
        Stock.cantidad,  # cantidad disponible
        Stock.cantidad_total,
        Stock.ubicacion,
        Stock.estado,
        Stock.visto_en,
        Stock.fecha_actual,
        Stock.comentarios,
        Stock.enlace_compra,
        Stock.fecha_compra,
        Stock.precio,
        Stock.detalles
    )
    resultados = query.all()
    stock_items = []
    for r in resultados:
        row = dict(r._asdict())
        
        # Renombramos cantidad para mostrar como disponible
        # row["cantidad_disponible"] = row.pop("cantidad")

        # Precio por unidad como float
        if row["cantidad_total"] not in (None, 0) and row["precio"] not in (None, 0):
            precio_unidad = round(float(row["precio"]) / row["cantidad_total"], 2)
            row["precio_unidad"] = precio_unidad
        else:
            row["precio_unidad"] = None

        # Precio total se deja como float
        if row["precio"] is not None:
            row["precio"] = float(row["precio"])

        # detalles JSONB
        stock_items.append(row)

    return stock_items



@app.post("/stock/", response_model=dict)
def crear_stock(stock: StockCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # Si no viene detalles en el payload, aseguramos que sea un dict vacío
    if not hasattr(stock, "detalles") or stock.detalles is None:
        stock.detalles = {}
    
    db_stock = Stock(**stock.dict())
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return {"message": "Stock creado correctamente"}


@app.put("/stock/{stock_id}", response_model=dict)
def actualizar_stock(stock_id: int, stock_data: StockCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock no encontrado")
    
    for key, value in stock_data.dict().items():
        setattr(stock, key, value)
    
    # aseguramos que detalles siempre sea dict
    if getattr(stock, "detalles", None) is None:
        stock.detalles = {}
    
    db.commit()
    db.refresh(stock)
    return {"message": "Stock editado correctamente"}


@app.delete("/stock/{stock_id}", response_model=dict)
def eliminar_stock(stock_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock no encontrado")
    db.delete(stock)
    db.commit()
    return {"message": "Stock eliminado correctamente"}
