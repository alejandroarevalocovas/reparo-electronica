// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api/api";
import Layout from "./components/Layout";
import PedidosList from "./pages/PedidosList";
import ClientesList from "./pages/ClientesList";
import StockList from "./pages/StockList";
import Login from "./pages/Login";

function App() {
  const [user, setUser] = React.useState(
    localStorage.getItem("token") && localStorage.getItem("username")
      ? localStorage.getItem("username")
      : null
  );

  // ✅ Validar token al arrancar la app
  React.useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Llama a un endpoint protegido de tu backend
          await api.get("/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Token válido → no hacemos nada
        } catch (err) {
          // Token inválido o expirado → cerrar sesión
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          setUser(null);
        }
      }
    };

    validateToken();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={!user ? <Login onLogin={setUser} /> : <Navigate to="/pedidos" />}
        />

        {/* Layout y rutas protegidas */}
        <Route
          path="/"
          element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route index element={<PedidosList />} />           
          <Route path="pedidos" element={<PedidosList />} />  
          <Route path="clientes" element={<ClientesList />} />
          <Route path="stock" element={<StockList />} />  {/* NUEVO */}
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to={user ? "/pedidos" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
