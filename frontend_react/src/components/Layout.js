import React, { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { IconButton, Tooltip, Box, Button, Typography } from "@mui/material";

function Layout({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar izquierdo */}
      <Box
        sx={{
          width: menuOpen ? 240 : 60,
          bgcolor: "grey.900",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s",
        }}
      >
        {/* Toggle */}
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 64, borderBottom: "1px solid grey" }}>
          <IconButton onClick={toggleMenu} sx={{ color: "white" }}>
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Box>

        {/* Navegación */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Link to="/pedidos" style={{ textDecoration: "none", color: "inherit" }}>
              <Tooltip title="Pedidos" placement="right" disableHoverListener={menuOpen}>
                <Box sx={{ display: "flex", alignItems: "center", p: 2, "&:hover": { bgcolor: "grey.800" }, cursor: "pointer" }}>
                  <AssignmentIcon />
                  {menuOpen && <Typography sx={{ ml: 2 }}>Pedidos</Typography>}
                </Box>
              </Tooltip>
            </Link>
            {/* Más items aquí */}
          </Box>
        </Box>

        {/* Usuario y Logout */}
<Box
  sx={{
    p: 2,
    borderTop: "1px solid grey",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center", // centra verticalmente si hay espacio extra
  }}
>
  {/* Usuario */}
  {menuOpen ? (
    <Typography sx={{ textAlign: "center" }}>{user}</Typography>
  ) : (
    <Tooltip title={user} placement="right">
      <Typography>👤</Typography>
    </Tooltip>
  )}

  {/* Logout */}
  <Tooltip title={menuOpen ? "" : "Logout"} placement="right">
    <Button
      variant="contained"
      color="error"
      onClick={onLogout}
      sx={{
        mt: 1,
        width: menuOpen ? "80%" : "40px", // un poco más pequeño que el sidebar
        minWidth: 0,
        p: menuOpen ? "6px 12px" : "6px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center", // centra el icono verticalmente
      }}
    >
      {menuOpen ? "Logout" : "⏻"}
    </Button>
  </Tooltip>
</Box>
      </Box>

      {/* Contenido principal */}
      <Box sx={{ flex: 1, p: 3, bgcolor: "grey.100", overflow: "auto" }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
