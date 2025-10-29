import React, { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import { IconButton, Tooltip, Box, Button, Typography, Divider } from "@mui/material";

function Layout({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "grey.100" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: menuOpen ? 240 : 60,
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s",
          boxShadow: 3,
        }}
      >
        {/* Toggle */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 64,
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <IconButton onClick={toggleMenu} sx={{ color: "white" }}>
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Box>

        {/* Sección Datos */}
        <Box sx={{ flex: 1, mt: 2 }}>
          {menuOpen && (
            <Typography
              sx={{
                px: 2,
                mb: 1,
                fontWeight: 600,
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              DATOS
            </Typography>
          )}

          {/* Pedidos */}
          <Link to="/pedidos" style={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title="Pedidos" placement="right" disableHoverListener={menuOpen}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <AssignmentIcon />
                {menuOpen && <Typography sx={{ ml: 2, fontWeight: 500 }}>Pedidos</Typography>}
              </Box>
            </Tooltip>
          </Link>

          {/* Clientes */}
          <Link to="/clientes" style={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title="Clientes" placement="right" disableHoverListener={menuOpen}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <PersonIcon />
                {menuOpen && <Typography sx={{ ml: 2, fontWeight: 500 }}>Clientes</Typography>}
              </Box>
            </Tooltip>
          </Link>

          {/* Stock */}
          <Link to="/stock" style={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title="Stock" placement="right" disableHoverListener={menuOpen}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <InventoryIcon />
                {menuOpen && <Typography sx={{ ml: 2, fontWeight: 500 }}>Stock</Typography>}
              </Box>
            </Tooltip>
          </Link>

          <Divider sx={{ my: 1, borderColor: "rgba(255,255,255,0.3)" }} />

          {/* Sección Gráficos */}
          {menuOpen && (
            <Typography
              sx={{
                px: 2,
                mb: 1,
                fontWeight: 600,
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              DASHBOARDS
            </Typography>
          )}

          {/* Finanzas */}
          <Link to="/dashboard/finanzas" style={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title="Dashboard Finanzas" placement="right" disableHoverListener={menuOpen}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <ShowChartIcon />
                {menuOpen && <Typography sx={{ ml: 2, fontWeight: 500 }}>Finanzas</Typography>}
              </Box>
            </Tooltip>
          </Link>

          {/* Estadísticas */}
          <Link to="/dashboard/estadisticas" style={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title="Dashboard Estadísticas" placement="right" disableHoverListener={menuOpen}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <BarChartIcon />
                {menuOpen && <Typography sx={{ ml: 2, fontWeight: 500 }}>Estadísticas</Typography>}
              </Box>
            </Tooltip>
          </Link>
        </Box>

        {/* Usuario y Logout */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {menuOpen ? (
            <Typography sx={{ textAlign: "center", fontWeight: 500 }}>{user}</Typography>
          ) : (
            <Tooltip title={user} placement="right">
              <Typography>👤</Typography>
            </Tooltip>
          )}

          <Tooltip title={menuOpen ? "" : "Log out"} placement="right">
            <Button
              variant="contained"
              color="error"
              onClick={onLogout}
              sx={{
                mt: 1,
                width: menuOpen ? "80%" : "40px",
                minWidth: 0,
                p: menuOpen ? "6px 12px" : "6px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              {menuOpen ? "Log out" : "⏻"}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Contenido principal */}
      <Box
        sx={{
          flex: 1,
          p: 3,
          bgcolor: "grey.100",
          overflow: "auto",
          transition: "all 0.3s",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
