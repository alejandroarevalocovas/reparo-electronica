// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import PedidosList from "./pages/PedidosList";
import ClientesList from "./pages/ClientesList"; // <--- nuevo import
import Login from "./pages/Login";

function App() {
  const [user, setUser] = React.useState(
    localStorage.getItem("token") && localStorage.getItem("username")
      ? localStorage.getItem("username")
      : null
  );

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
          <Route index element={<PedidosList />} />           {/* / */}
          <Route path="pedidos" element={<PedidosList />} />  {/* /pedidos */}
          <Route path="clientes" element={<ClientesList />} />{/* /clientes */}
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to={user ? "/pedidos" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
