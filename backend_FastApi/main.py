# main.py
# uvicorn main:app --reload

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm,OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Numeric, Text, ForeignKey, Date
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from passlib.hash import bcrypt
from pydantic import BaseModel
from typing import Optional
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

# DATABASE_URL = (
#     f"postgresql://{db_conf['user']}:{db_conf['password']}@"
#     f"{db_conf['host']}:{db_conf['port']}/{db_conf['name']}"
# )

# ---------- Cargar configuración Render ----------

DATABASE_URL = os.environ.get("DATABASE_URL")
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------- TOKEN ----------
#token_conf = config["token"]
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
    fecha_entrada = Column(Date, default=date.today)
    equipo = Column(String(100), nullable=False)
    problema = Column(Text)
    estado = Column(String(50), default="pendiente")
    fecha_reparacion = Column(Date, nullable=True)
    fecha_pagado = Column(Date, nullable=True)
    precio = Column(Numeric(10, 2), nullable=True)
    comentarios = Column(Text, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))  # relación con Cliente
    numero_serie = Column(String(100), nullable=False)
    part_number = Column(String(100), nullable=True)
    cliente = relationship("Cliente")  # ORM relationship opcional

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    localizacion = Column(String(100), nullable=True)
    contacto = Column(String(100), nullable=True)

# Crear tablas en la base de datos
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
    problema: Optional[str] = None
    estado: Optional[str] = "pendiente"
    fecha_reparacion: Optional[date] = None
    precio: Optional[float] = None
    fecha_pagado: Optional[date] = None
    cliente_id: int
    nombre_cliente: str
    comentarios: Optional[str] = None

    class Config:
        orm_mode = True

class PedidoCreate(BaseModel):
    numero_serie: str
    part_number: Optional[str] = None
    equipo: str
    fecha_entrada: date
    problema: Optional[str] = None
    estado: Optional[str] = "pendiente"
    fecha_reparacion: Optional[date] = None
    precio: Optional[float] = None
    fecha_pagado: Optional[date] = None
    cliente_id: int
    comentarios: Optional[str] = None


class PedidoOut(PedidoBase):
    id: int
    fecha_entrada: date
    fecha_reparacion: Optional[date] = None
    fecha_pagado: Optional[date] = None

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
    "http://localhost:3000",  # React
    "http://127.0.0.1:3000",  # Otra forma de localhost
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # permite estos orígenes
    allow_credentials=True,
    allow_methods=["*"],         # permite POST, GET, OPTIONS...
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API de servicio técnico 🚀"}

# ---------- LOGIN ----------
@app.post("/login")
def login_json(login_data: LoginData, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not user.verify_password(login_data.password):
        raise HTTPException(status_code=401, detail="Usuario o password incorrecto")
    
    token = create_access_token({"sub": user.username})
    print("token",token)
    return {"access_token": token, "token_type": "bearer"}

# ---------- PEDIDOS ----------
@app.get("/pedidos/", response_model=list[PedidoBase])
def listar_pedidos(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # Query manual con join
    query = (
        db.query(
            Pedido.id,
            Pedido.numero_serie,
            Pedido.part_number,
            Pedido.equipo,
            Pedido.fecha_entrada,
            Pedido.problema,
            Pedido.estado,
            Pedido.fecha_reparacion,
            Pedido.precio,
            Pedido.fecha_pagado,
            Pedido.comentarios,
            Pedido.cliente_id,
            Cliente.nombre.label("nombre_cliente")  # renombramos la columna
        )
        .join(Cliente, Pedido.cliente_id == Cliente.id)
    )

    resultados = query.all()

    # Convertimos a dict para que Pydantic lo pueda serializar
    pedidos = [dict(r._asdict()) if hasattr(r, "_asdict") else r for r in resultados]

    return pedidos

@app.post("/pedidos/", response_model=dict)
def crear_pedido(pedido: PedidoCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    db_pedido = Pedido(**pedido.dict())
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    return {"message": "Pedido creado correctamente"}


@app.put("/pedidos/{pedido_id}", response_model=dict)
def actualizar_pedido(
    pedido_id: int,
    pedido_data: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    for key, value in pedido_data.dict().items():
        setattr(pedido, key, value)
    db.commit()
    db.refresh(pedido)
    return {"message": "Pedido actualizado correctamente"}


@app.delete("/pedidos/{pedido_id}")
def eliminar_pedido(pedido_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(pedido)
    db.commit()
    return {"message": "Pedido eliminado"}

# ---------- CLIENTES ----------
@app.get("/clientes/", response_model=list[dict])
def listar_clientes(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    query = db.query(
        Cliente.id,
        Cliente.nombre,
        Cliente.localizacion,
        Cliente.contacto
    )
    resultados = query.all()
    clientes = [dict(r._asdict()) if hasattr(r, "_asdict") else r for r in resultados]
    return clientes

@app.post("/clientes/", response_model=dict)
def crear_cliente(nombre: str = Body(...), localizacion: Optional[str] = Body(None),
                  contacto: Optional[str] = Body(None), db: Session = Depends(get_db),
                  current_user: str = Depends(get_current_user)):
    cliente = Cliente(nombre=nombre, localizacion=localizacion, contacto=contacto)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return {"id": cliente.id, "nombre": cliente.nombre, "localizacion": cliente.localizacion, "contacto": cliente.contacto}

# Editar cliente
@app.put("/clientes/{cliente_id}", response_model=dict)
def editar_cliente(
    cliente_id: int,
    nombre: Optional[str] = Body(None),
    localizacion: Optional[str] = Body(None),
    contacto: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if nombre is not None:
        cliente.nombre = nombre
    if localizacion is not None:
        cliente.localizacion = localizacion
    if contacto is not None:
        cliente.contacto = contacto

    db.commit()
    db.refresh(cliente)
    return {"id": cliente.id, "nombre": cliente.nombre, "localizacion": cliente.localizacion, "contacto": cliente.contacto}

# Eliminar cliente
@app.delete("/clientes/{cliente_id}", response_model=dict)
def eliminar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    db.delete(cliente)
    db.commit()
    return {"message": "Cliente eliminado correctamente"}