// src/pages/DashboardFinanzas.js
import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { Box, Typography, CircularProgress, Paper, Grid, Card, CardContent } from "@mui/material";

const nombresMeses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function DashboardFinanzas() {
  const [dataPedidos, setDataPedidos] = useState([]);
  const [dataStock, setDataStock] = useState([]);
  const [dataEquipos, setDataEquipos] = useState([]);
  const [dataPendienteClientes, setDataPendienteClientes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFinanzas = async () => {
      try {
        const token = localStorage.getItem("token");

        // ---------- PEDIDOS ----------
        const resPedidos = await api.get("/pedidos/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pedidos = resPedidos.data;

        // ---------- CLIENTES ----------
        const resClientes = await api.get("/clientes/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const clientes = resClientes.data;
        const clientesMap = {};
        clientes.forEach(c => (clientesMap[c.id] = c.nombre || "Desconocido"));

        // ---------- FILTRAR PEDIDOS CERRADOS ----------
        const pedidosCerrados = pedidos.filter(p => p.estado === "Entregado / Cerrado");

        // ---------- DATOS POR MES ----------
        const mesesPedidos = {};
        let totalIngresos = 0;
        let totalGastos = 0;

        pedidosCerrados.forEach(p => {
          if (!p.fecha_reparacion) return;
          const fecha = new Date(p.fecha_reparacion);
          const mesKey = `${fecha.getMonth()}-${fecha.getFullYear()}`;
          if (!mesesPedidos[mesKey]) mesesPedidos[mesKey] = { ingresos: 0, gastos: 0, beneficio: 0 };

          const ingresos = parseFloat(p.precio || 0);
          const gastos = parseFloat(p.precio_stock || 0);
          const beneficio = parseFloat(p.cobro_neto || 0);

          mesesPedidos[mesKey].ingresos += ingresos;
          mesesPedidos[mesKey].gastos += gastos;
          mesesPedidos[mesKey].beneficio += beneficio;

          totalIngresos += ingresos;
          totalGastos += gastos;
        });

        const chartPedidos = Object.entries(mesesPedidos)
          .map(([key, values]) => {
            const [mesNum, anio] = key.split("-");
            return {
              mes: `${nombresMeses[parseInt(mesNum)]} ${anio}`,
              ingresos: values.ingresos,
              gastos: values.gastos,
              beneficio: values.beneficio,
            };
          })
          .sort((a, b) => {
            const [mesA, anioA] = a.mes.split(" ");
            const [mesB, anioB] = b.mes.split(" ");
            return parseInt(anioA) === parseInt(anioB)
              ? nombresMeses.indexOf(mesA) - nombresMeses.indexOf(mesB)
              : parseInt(anioA) - parseInt(anioB);
          });

        // ---------- STOCK ----------
        const resStock = await api.get("/stock/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const mesesStock = {};
        let totalGastosStock = 0;

        resStock.data.forEach(s => {
          if (!s.fecha_compra) return;
          const fecha = new Date(s.fecha_compra);
          const mesKey = `${fecha.getMonth()}-${fecha.getFullYear()}`;
          if (!mesesStock[mesKey]) mesesStock[mesKey] = { gasto: 0 };
          const gasto = parseFloat(s.precio || 0);
          mesesStock[mesKey].gasto += gasto;
          totalGastosStock += gasto;
        });

        const chartStock = Object.entries(mesesStock)
          .map(([key, values]) => {
            const [mesNum, anio] = key.split("-");
            return {
              mes: `${nombresMeses[parseInt(mesNum)]} ${anio}`,
              mesNum: parseInt(mesNum),
              anio: parseInt(anio),
              gasto: values.gasto,
            };
          })
          .sort((a, b) => (a.anio === b.anio ? a.mesNum - b.mesNum : a.anio - b.anio))
          .map(({ mes, gasto }) => ({ mes, gasto })); // quitamos los campos auxiliares


        // ---------- INGRESOS POR TIPO DE EQUIPO ----------
        const equiposMap = {};
        pedidosCerrados.forEach(p => {
          if (!p.equipo) return;
          if (!equiposMap[p.equipo]) equiposMap[p.equipo] = 0;
          equiposMap[p.equipo] += parseFloat(p.precio || 0);
        });

        const chartEquipos = Object.entries(equiposMap)
          .map(([equipo, ingresos]) => ({ equipo, ingresos }))
          .sort((a, b) => b.ingresos - a.ingresos);

        // ---------- PENDIENTE DE COBRO POR MES Y CLIENTE ----------
        const pendientes = pedidos.filter(p => (p.precio_total || 0) > (p.precio || 0));
        //console.log("PENDIENTES",pendientes)
        const pendientesPorMes = {};
        pendientes.forEach(p => {
          if (!p.fecha_reparacion) return;
          const fecha = new Date(p.fecha_reparacion);
          const mesKey = `${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`;
          const cliente = clientesMap[p.cliente_id] || "Desconocido";
          const pendiente = (p.precio_total || 0) - (p.precio || 0);

          if (!pendientesPorMes[mesKey]) pendientesPorMes[mesKey] = {};
          if (!pendientesPorMes[mesKey][cliente]) pendientesPorMes[mesKey][cliente] = 0;
          pendientesPorMes[mesKey][cliente] += pendiente;
        });

        // Obtener lista de todos los clientes involucrados en pendientes
        const clientesUnicos = [...new Set(pendientes.map(p => clientesMap[p.cliente_id]))];

        // Crear los datos base agrupados por mes
        const chartPendienteBase = Object.entries(pendientesPorMes).map(([mes, valores]) => {
          const obj = { mes };
          clientesUnicos.forEach(c => {
            obj[c] = valores[c] || 0;
          });
          return obj;
        });

        // Calcular la suma total por cliente en todos los meses
        const totalesPorCliente = {};
        chartPendienteBase.forEach(fila => {
          clientesUnicos.forEach(cliente => {
            totalesPorCliente[cliente] = (totalesPorCliente[cliente] || 0) + (fila[cliente] || 0);
          });
        });

        // Filtrar los clientes que realmente tienen deuda > 0
        const clientesConDeuda = clientesUnicos.filter(c => totalesPorCliente[c] > 0);

        // Crear versión filtrada de los datos
        const chartPendiente = chartPendienteBase.map(fila => {
          const nuevaFila = { mes: fila.mes };
          clientesConDeuda.forEach(c => {
            nuevaFila[c] = fila[c] || 0;
          });
          return nuevaFila;
        });


        // ---------- SET STATES ----------
        setDataPedidos(chartPedidos);
        setDataStock(chartStock);
        setDataEquipos(chartEquipos);
        setDataPendienteClientes(chartPendiente);

        setResumen({
          total_pedidos: pedidosCerrados.length,
          total_ingresos: totalIngresos,
          total_gastos: totalGastos,
          total_beneficio: totalIngresos - totalGastos,
          total_gastos_stock: totalGastosStock,
        });
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos financieros");
      } finally {
        setLoading(false);
      }
    };

    fetchFinanzas();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );

  if (error)
    return <Box textAlign="center" color="error.main">{error}</Box>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Dashboard Financiero
      </Typography>

      {/* TARJETAS RESUMEN */}
      {resumen && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent><Typography variant="h6">Pedidos cerrados</Typography>
              <Typography variant="h4" fontWeight="bold">{resumen.total_pedidos}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent><Typography variant="h6">Ingresos totales (€)</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">{resumen.total_ingresos.toFixed(2)}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent><Typography variant="h6">Gastos stock usado (€)</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">{resumen.total_gastos.toFixed(2)}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent><Typography variant="h6">Beneficio neto (€)</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">{resumen.total_beneficio.toFixed(2)}</Typography></CardContent></Card>
          </Grid>
        </Grid>
      )}

      {/* 1️⃣ BENEFICIOS POR MES */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Beneficios por mes</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dataPedidos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
            <Legend />
            <Line type="monotone" dataKey="ingresos" stroke="#4caf50" strokeWidth={2} name="Ingresos (€)" />
            <Line type="monotone" dataKey="gastos" stroke="#f44336" strokeWidth={2} name="Gastos (€)" />
            <Line type="monotone" dataKey="beneficio" stroke="#2196f3" strokeWidth={2} name="Beneficio (€)" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* 2️⃣ GASTOS EN STOCK POR MES */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Gastos en stock por mes</Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={dataStock}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
            <Legend />
            <Bar dataKey="gasto" fill="#f44336" name="Gasto en stock (€)" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* 3️⃣ INGRESOS POR TIPO DE EQUIPO */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Ingresos por tipo de equipo</Typography>
        <ResponsiveContainer width="100%" height={dataEquipos.length * 40}>
          <BarChart
            data={dataEquipos}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 150, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="equipo" type="category" width={150} />
            <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
            <Legend />
            <Bar dataKey="ingresos" fill="#4caf50" name="Ingresos (€)" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* 4️⃣ PENDIENTE DE COBRO POR MES Y CLIENTE */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>Pendiente de cobro por mes y cliente</Typography>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={dataPendienteClientes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
            <Legend />
            {dataPendienteClientes.length > 0 &&
              Object.keys(dataPendienteClientes[0])
                .filter(k => k !== "mes")
                .map((cliente, idx) => (
                  <Bar
                    key={cliente}
                    dataKey={cliente}
                    stackId="a"
                    fill={`hsl(${(idx * 50) % 360}, 70%, 50%)`}
                    name={cliente}
                  />
                ))}

          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}

export default DashboardFinanzas;
