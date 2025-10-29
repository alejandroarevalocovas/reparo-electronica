// src/pages/DashboardEstadisticas.js
import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Box, Typography, CircularProgress, Paper, Grid, Card, CardContent } from "@mui/material";

function DashboardEstadisticas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [pedidosEstado, setPedidosEstado] = useState([]);
  const [pedidosEquipo, setPedidosEquipo] = useState([]);
  const [pedidosCliente, setPedidosCliente] = useState([]);
  const [stockTipo, setStockTipo] = useState([]);

  useEffect(() => {
    const fetchEstadisticas = async () => {
      try {
        const token = localStorage.getItem("token");

        // ---------- PEDIDOS ----------
        const resPedidos = await api.get("/pedidos/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pedidos = resPedidos.data;

        // Resumen
        const totalPedidos = pedidos.length;
        const pedidosCerrados = pedidos.filter(p => p.estado === "Entregado / Cerrado").length;
        const pedidosPendientes = pedidos.filter(p => p.estado !== "Entregado / Cerrado").length;

        // Pedidos por estado
        const estadoMap = {};
        pedidos.forEach(p => {
          const estado = p.estado && p.estado.trim() !== "" ? p.estado : "Sin estado";
          estadoMap[estado] = (estadoMap[estado] || 0) + 1;
        });
        const chartPedidosEstado = Object.entries(estadoMap)
          .map(([estado, cantidad]) => ({ estado, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        // Pedidos por equipo
        const equipoMap = {};
        pedidos.forEach(p => {
          const equipo = p.equipo && p.equipo.trim() !== "" ? p.equipo : "Sin equipo";
          equipoMap[equipo] = (equipoMap[equipo] || 0) + 1;
        });
        const chartPedidosEquipo = Object.entries(equipoMap)
          .map(([equipo, cantidad]) => ({ equipo, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        // Pedidos por cliente (Top 10)
        const clienteMap = {};
        pedidos.forEach(p => {
          const cliente = p.nombre_cliente && p.nombre_cliente.trim() !== "" ? p.nombre_cliente : "Sin cliente";
          clienteMap[cliente] = (clienteMap[cliente] || 0) + 1;
        });
        const chartPedidosCliente = Object.entries(clienteMap)
          .map(([cliente, cantidad]) => ({ cliente, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 10);

        // ---------- STOCK ----------
        const resStock = await api.get("/stock/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const stock = resStock.data;

        // Stock por tipo
        const tipoMap = {};
        stock.forEach(s => {
          const tipo = s.tipo && s.tipo.trim() !== "" ? s.tipo : "Sin tipo";
          tipoMap[tipo] = (tipoMap[tipo] || 0) + (s.cantidad || 0);
        });
        const chartStockTipo = Object.entries(tipoMap)
          .map(([tipo, cantidad]) => ({ tipo, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        // ---------- RESUMEN ----------
        setResumen({
          totalPedidos,
          pedidosCerrados,
          pedidosPendientes,
          totalStock: stock.reduce((acc, s) => acc + (s.cantidad || 0), 0),
        });

        setPedidosEstado(chartPedidosEstado);
        setPedidosEquipo(chartPedidosEquipo);
        setPedidosCliente(chartPedidosCliente);
        setStockTipo(chartStockTipo);

      } catch (err) {
        console.error(err);
        setError("Error al cargar las estadísticas");
      } finally {
        setLoading(false);
      }
    };

    fetchEstadisticas();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box textAlign="center" color="error.main">
        {error}
      </Box>
    );

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Dashboard Estadísticas
      </Typography>

      {/* Tarjetas resumen */}
      {resumen && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Pedidos</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {resumen.totalPedidos}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Pedidos Cerrados</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {resumen.pedidosCerrados}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Stock Total</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {resumen.totalStock}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* --- GRÁFICOS --- */}

      {/* Pedidos por estado */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Pedidos por Estado</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={pedidosEstado}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="estado"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={120}
              tick={{ fontSize: 12, fill: "#333" }}
              overflow="visible"
            />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="cantidad" fill="#4caf50" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Pedidos por equipo */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Pedidos por Equipo</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={pedidosEquipo}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="equipo"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={120}
              tick={{ fontSize: 12, fill: "#333" }}
              overflow="visible"
            />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="cantidad" fill="#2196f3" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Pedidos por cliente (Top 10) */}
      {/* <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Top 10 Clientes por Pedidos</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={pedidosCliente}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 150, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="cliente" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="cantidad" fill="#ff9800" />
          </BarChart>
        </ResponsiveContainer>
      </Paper> */}

      {/* Stock por tipo */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>Stock por Tipo</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={stockTipo}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="tipo"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={120}
              tick={{ fontSize: 12, fill: "#333" }}
              overflow="visible"
            />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="cantidad" fill="#9c27b0" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}

export default DashboardEstadisticas;
