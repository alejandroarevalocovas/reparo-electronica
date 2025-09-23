import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import PedidosList from "./pages/PedidosList";
import Login from "./pages/Login";

function App() {
  //const [user, setUser] = React.useState(localStorage.getItem("token") || null);
  const [user, setUser] = React.useState(localStorage.getItem("username") || null);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <Route path="*" element={<Login onLogin={() => setUser("admin")} />} />
        ) : (
          <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
            <Route index element={<PedidosList />} /> {/* / */}
            <Route path="pedidos" element={<PedidosList />} /> {/* /pedidos */}
            {/* Aquí puedes añadir más páginas */}
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
