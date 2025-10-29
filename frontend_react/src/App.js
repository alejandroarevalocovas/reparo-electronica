// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api/api";
import Layout from "./components/Layout";
import PedidosList from "./pages/PedidosList";
import ClientesList from "./pages/ClientesList";
import StockList from "./pages/StockList";
import Login from "./pages/Login";

// 🆕 Importamos los dashboards
import DashboardFinanzas from "./pages/DashboardFinanzas";
import DashboardEstadisticas from "./pages/DashboardEstadisticas";

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
          await api.get("/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
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
          element={
            user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
          }
        >
          <Route index element={<PedidosList />} />
          <Route path="pedidos" element={<PedidosList />} />
          <Route path="clientes" element={<ClientesList />} />
          <Route path="stock" element={<StockList />} />

          {/* 🆕 Dashboards */}
          <Route path="dashboard/finanzas" element={<DashboardFinanzas />} />
          <Route path="dashboard/estadisticas" element={<DashboardEstadisticas />} />
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to={user ? "/pedidos" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
