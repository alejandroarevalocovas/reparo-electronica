#uvicorn main:app --reload
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm,OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Numeric, Text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from passlib.hash import bcrypt
from pydantic import BaseModel
from typing import Optional
import yaml
from pathlib import Path
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware
# ---------- Cargar configuración ----------
config_path = Path(__file__).parent / "config.yaml"

with open(config_path, "r") as f:
    config = yaml.safe_load(f)

db_conf = config["database"]

DATABASE_URL = (
    f"postgresql://{db_conf['user']}:{db_conf['password']}@"
    f"{db_conf['host']}:{db_conf['port']}/{db_conf['name']}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------- TOKEN ----------
token_conf = config["token"]
SECRET_KEY = token_conf['secret_key']
ALGORITHM = token_conf['algorithm']
ACCESS_TOKEN_EXPIRE_MINUTES = token_conf['expire']
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
    fecha_entrada = Column(DateTime, default=datetime.utcnow)
    equipo = Column(String(100), nullable=False)
    problema = Column(Text)
    estado = Column(String(50), default="pendiente")
    fecha_reparacion = Column(DateTime, nullable=True)
    fecha_pagado = Column(DateTime, nullable=True)
    precio = Column(Numeric(10, 2), nullable=True)
    comentarios = Column(Text, nullable=True)

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)

# ---------- Esquemas Pydantic ----------

class LoginData(BaseModel):
    username: str
    password: str

class PedidoBase(BaseModel):
    equipo: str
    problema: Optional[str] = None
    estado: Optional[str] = "pendiente"
    precio: Optional[float] = None
    comentarios: Optional[str] = None

class PedidoCreate(PedidoBase):
    pass

class PedidoOut(PedidoBase):
    id: int
    fecha_entrada: datetime
    fecha_reparacion: Optional[datetime] = None
    fecha_pagado: Optional[datetime] = None

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
@app.post("/pedidos/", response_model=PedidoOut)
def crear_pedido(pedido: PedidoCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    db_pedido = Pedido(**pedido.dict())
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

@app.get("/pedidos/", response_model=list[PedidoOut])
def listar_pedidos(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(Pedido).all()

@app.get("/pedidos/{pedido_id}", response_model=PedidoOut)
def obtener_pedido(pedido_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido

@app.put("/pedidos/{pedido_id}", response_model=PedidoOut)
def actualizar_pedido(pedido_id: int, pedido_data: PedidoCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    for key, value in pedido_data.dict().items():
        setattr(pedido, key, value)
    db.commit()
    db.refresh(pedido)
    return pedido

@app.delete("/pedidos/{pedido_id}")
def eliminar_pedido(pedido_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(pedido)
    db.commit()
    return {"message": "Pedido eliminado"}

