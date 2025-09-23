// src/pages/PedidosList.js
import React, { useEffect, useState } from "react";
import Table from "../components/Table";
import { api } from "../api/api";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Autocomplete,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

function PedidosList() {
  const [pedidos, setPedidos] = useState([]);
  const [columns, setColumns] = useState([]);
  const [openPedidoModal, setOpenPedidoModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [newPedido, setNewPedido] = useState({});
  const [clientes, setClientes] = useState([]);
  const [openClienteModal, setOpenClienteModal] = useState(false);
  const [newCliente, setNewCliente] = useState({ nombre: "", localizacion: "", contacto: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const token = localStorage.getItem("token");

  // Fetch pedidos
  const fetchPedidos = async () => {
    try {
      const res = await api.get("/pedidos", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      if (data.length > 0) {
        const cols = Object.keys(data[0])
          .filter(key => key !== "id" && key !== "cliente_id") // ocultamos cliente_id en tabla
          .map(key => ({ accessorKey: key, id: key, header: key.replace(/_/g, " ").toUpperCase() }));
        setColumns(cols);
      }
      setPedidos(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchPedidos(); }, [token]);

  // Fetch clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get("/clientes/", { headers: { Authorization: `Bearer ${token}` } });
        setClientes(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClientes();
  }, [token]);

  const handleChange = (e) => setNewPedido({ ...newPedido, [e.target.name]: e.target.value });

  const handleDateChange = (name, value) => {
    setNewPedido({ ...newPedido, [name]: value ? dayjs(value).format("YYYY-MM-DD") : null });
  };

  const handleRowClick = (pedido) => {
    setEditingPedido(pedido);
    setNewPedido({ ...pedido, cliente_id: pedido.cliente_id });
    setOpenPedidoModal(true);
  };

  const handleSubmitPedido = async () => {
    try {
      const payload = { ...newPedido };
      delete payload.nombre_cliente;
      ["fecha_entrada", "fecha_reparacion", "fecha_pagado"].forEach(f => {
        if (payload[f]) payload[f] = dayjs(payload[f]).format("YYYY-MM-DD");
      });

      if (editingPedido) {
        await api.put(`/pedidos/${editingPedido.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });

        const clienteSeleccionado = clientes.find(c => c.id === payload.cliente_id);
        setPedidos(prev =>
          prev.map(p =>
            p.id === editingPedido.id ? { ...p, ...payload, nombre_cliente: clienteSeleccionado?.nombre || "" } : p
          )
        );

        setSnackbar({ open: true, message: "Pedido actualizado correctamente", severity: "success" });
      } else {
        await api.post("/pedidos/", payload, { headers: { Authorization: `Bearer ${token}` } });
        fetchPedidos();
        setSnackbar({ open: true, message: "Pedido creado correctamente", severity: "success" });
      }

      setOpenPedidoModal(false);
      setNewPedido({});
      setEditingPedido(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al guardar pedido", severity: "error" });
    }
  };

  const handleDeletePedido = async () => {
    try {
      if (!editingPedido) return;
      await api.delete(`/pedidos/${editingPedido.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPedidos(prev => prev.filter(p => p.id !== editingPedido.id));
      setSnackbar({ open: true, message: "Pedido eliminado correctamente", severity: "success" });
      setOpenPedidoModal(false);
      setNewPedido({});
      setEditingPedido(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al eliminar pedido", severity: "error" });
    }
  };

  const handleSubmitCliente = async () => {
    try {
      const res = await api.post("/clientes/", newCliente, { headers: { Authorization: `Bearer ${token}` } });
      setClientes([...clientes, res.data]);
      setNewPedido({ ...newPedido, cliente_id: res.data.id });
      setSnackbar({ open: true, message: "Cliente creado correctamente", severity: "success" });
      setOpenClienteModal(false);
      setNewCliente({ nombre: "", localizacion: "", contacto: "" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al crear cliente", severity: "error" });
    }
  };

  return (
    <Box sx={{ backgroundColor: "#f4f6f8", minHeight: "100vh", p: 3 }}>
      <Box sx={{ backgroundColor: "white", borderRadius: 2, p: 3, boxShadow: 2 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: 16 }}>Pedidos</h2>

        <Button
          variant="contained"
          color="primary"
          onClick={() => { setEditingPedido(null); setNewPedido({}); setOpenPedidoModal(true); }}
          sx={{ mb: 2 }}
        >
          Añadir Pedido
        </Button>

        <Table
          rows={pedidos}
          columns={columns}
          onRowClick={handleRowClick}
          muiTableContainerProps={{ sx: { borderRadius: 2, boxShadow: 1, bgcolor: "white" } }}
          compact
        />
      </Box>

      {/* Modal Crear/Editar Pedido */}
      <Dialog
        open={openPedidoModal}
        onClose={() => setOpenPedidoModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>{editingPedido ? "Editar Pedido" : "Nuevo Pedido"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Autocomplete Cliente */}
            <Grid item xs={6} key="cliente">
              <Autocomplete
                options={clientes}
                getOptionLabel={(option) => option.nombre}
                value={clientes.find(c => c.id === newPedido.cliente_id) || null}
                onChange={(e, value) => setNewPedido({ ...newPedido, cliente_id: value ? value.id : null })}
                renderInput={(params) => <TextField {...params} label="Cliente" fullWidth margin="dense" variant="outlined" size="small" />}
              />
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setOpenClienteModal(true)}
                sx={{ mt: 1 }}
              >
                Nuevo Cliente
              </Button>
            </Grid>

            {/* Campos dinámicos */}
            {columns
              .filter(col => col.accessorKey !== "nombre_cliente")
              .map(col => (
                <Grid item xs={6} key={col.accessorKey}>
                  {col.accessorKey.includes("fecha") ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label={col.header}
                        value={newPedido[col.accessorKey] ? dayjs(newPedido[col.accessorKey]) : null}
                        onChange={value => handleDateChange(col.accessorKey, value)}
                        format="DD/MM/YYYY"
                        slotProps={{ textField: { fullWidth: true, margin: "dense", size: "small" } }}
                      />
                    </LocalizationProvider>
                  ) : (
                    <TextField
                      label={col.header}
                      name={col.accessorKey}
                      fullWidth
                      value={newPedido[col.accessorKey] || ""}
                      onChange={handleChange}
                      margin="dense"
                      size="small"
                    />
                  )}
                </Grid>
              ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPedidoModal(false)}>Cancelar</Button>
          {editingPedido && <Button variant="outlined" color="error" onClick={handleDeletePedido}>Eliminar</Button>}
          <Button variant="contained" color="primary" onClick={handleSubmitPedido}>
            {editingPedido ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Nuevo Cliente */}
      <Dialog
        open={openClienteModal}
        onClose={() => setOpenClienteModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Nuevo Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Nombre" fullWidth value={newCliente.nombre} onChange={e => setNewCliente({ ...newCliente, nombre: e.target.value })} margin="dense" size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Localización" fullWidth value={newCliente.localizacion} onChange={e => setNewCliente({ ...newCliente, localizacion: e.target.value })} margin="dense" size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Contacto" fullWidth value={newCliente.contacto} onChange={e => setNewCliente({ ...newCliente, contacto: e.target.value })} margin="dense" size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClienteModal(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSubmitCliente}>Crear Cliente</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PedidosList;
