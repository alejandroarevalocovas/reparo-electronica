// src/pages/PedidosList.js
import React, { useEffect, useState } from "react";
import Table from "../components/Table";
import { MaterialReactTable } from "material-react-table";
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
  Typography,
  Paper,
  Table as MuiTable,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import DeleteIcon from "@mui/icons-material/Delete";
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

  // Modal ver stock
  const [openStockModal, setOpenStockModal] = useState(false);
  const [stockModalPedido, setStockModalPedido] = useState(null);
  const [stockItems, setStockItems] = useState([]);

  // Modal asignar/editar stock
  const [openAsignarStockModal, setOpenAsignarStockModal] = useState(false);
  const [stockAsignado, setStockAsignado] = useState([]);
  const [stockDisponible, setStockDisponible] = useState([]);

  const token = localStorage.getItem("token");

  /** ---------------- Fetch pedidos ---------------- **/
  const fetchPedidos = async () => {
    try {
      const res = await api.get("/pedidos/", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      //console.log("DATAAAAAAAAAAA",res.data)
      if (data.length > 0) {
        const cols = Object.keys(data[0])
          .filter((key) => key !== "id" && key !== "cliente_id")
          .map((key) => {
            // Formateo de columnas específicas
            let Cell = undefined;
            if (key === "precio" || key === "precio_stock" || key === "cobro_neto") {
              Cell = ({ row }) => `${row.original[key]} €`;
            } else if (key === "tiempo_reparacion") {
              Cell = ({ row }) => row.original[key] != null ? `${row.original[key]} min` : "";
            }

            // Asignar header con condición especial para "precio"
            let header;
            if (key === "precio") {
              header = "COBRO CLIENTE";
            } else {
              header = key.replace(/_/g, " ").toUpperCase();
            }

            return {
              accessorKey: key,
              id: key,
              //header: key.replace(/_/g, " ").toUpperCase(),
              header,
              Cell, // si Cell es undefined, la tabla mostrará el valor normal
            };
          });

        // Añadir columna Stock como antes
        cols.push({
          accessorKey: "stock",
          id: "stock",
          header: "Stock",
          Cell: ({ row }) => (
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenStockModal(row.original);
              }}
            >
              Ver Stock
            </Button>
          ),
        });

        setColumns(cols);
      }

      setPedidos(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchPedidos(); }, [token]);

  /** ---------------- Fetch clientes ---------------- **/
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

  /** ---------------- Crear/Editar Pedido ---------------- **/
  const handleSubmitPedido = async () => {
    try {
      const payload = { ...newPedido, stocks: stockAsignado };
      delete payload.nombre_cliente;
      ["fecha_entrada", "fecha_reparacion", "fecha_pagado"].forEach((f) => {
        if (payload[f]) payload[f] = dayjs(payload[f]).format("YYYY-MM-DD");
      });

      if (editingPedido) {
        await api.put(`/pedidos/${editingPedido.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchPedidos();
        // const clienteSeleccionado = clientes.find((c) => c.id === payload.cliente_id);
        // setPedidos((prev) =>
        //   prev.map((p) =>
        //     p.id === editingPedido.id
        //       ? { ...p, ...payload, nombre_cliente: clienteSeleccionado?.nombre || "" }
        //       : p
        //   )
        // );
        setSnackbar({ open: true, message: "Pedido actualizado correctamente", severity: "success" });
      } else {
        const res = await api.post("/pedidos/", payload, { headers: { Authorization: `Bearer ${token}` } });
        //setEditingPedido(res.data);
        await fetchPedidos();
        setSnackbar({ open: true, message: "Pedido creado correctamente", severity: "success" });
      }

      setOpenPedidoModal(false);
      setNewPedido({});
      setEditingPedido(null);
      setStockAsignado([]);
      setStockDisponible([]);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al guardar pedido", severity: "error" });
    }
  };

  const handleDeletePedido = async () => {
    try {
      if (!editingPedido) return;
      await api.delete(`/pedidos/${editingPedido.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPedidos((prev) => prev.filter((p) => p.id !== editingPedido.id));
      setSnackbar({ open: true, message: "Pedido eliminado correctamente", severity: "success" });
      setOpenPedidoModal(false);
      setNewPedido({});
      setEditingPedido(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al eliminar pedido", severity: "error" });
    }
  };

  /** ---------------- Nuevo Cliente ---------------- **/
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

  /** ---------------- Modal Ver Stock ---------------- **/
  const handleOpenStockModal = async (pedido) => {
    try {
      const res = await api.get(`/pedido_stock/${pedido.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setStockItems(res.data);
      setStockModalPedido(pedido);
      setOpenStockModal(true);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al cargar stock", severity: "error" });
    }
  };

  /** ---------------- Modal Asignar/Editar Stock ---------------- **/
  const handleOpenAsignarStock = async (pedido = null) => {
    try {
      const resStock = await api.get("/stock/", { headers: { Authorization: `Bearer ${token}` } });
      const stockData = resStock.data.map(s => ({ ...s }));
      setStockDisponible(stockData);


      if (pedido) {
        const res = await api.get(`/pedido_stock/${pedido.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = Array.isArray(res.data) ? res.data : [];
        const mapped = data.map((s) => {
          const stockItem = stockData.find(sd => sd.referencia === s.referencia && sd.tipo === s.tipo);
          return { ...s, stock_id: stockItem?.id || null };
        });
        setStockAsignado(mapped);
      } else {
        setStockAsignado([]);
      }
      setOpenAsignarStockModal(true);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al cargar stock", severity: "error" });
    }
  };

  /** ---------------- Añadir Stock ---------------- **/
  const handleAddStock = (item, cantidad) => {
    if (!cantidad || cantidad <= 0 || item.cantidad < cantidad) return;

    setStockDisponible((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, cantidad: s.cantidad - cantidad } : s))
    );

    setStockAsignado((prev) => {
      const existe = prev.find((s) => s.stock_id === item.id);
      if (existe) {
        return prev.map((s) =>
          s.stock_id === item.id ? { ...s, cantidad_usada: s.cantidad_usada + cantidad } : s
        );
      }
      return [...prev, { stock_id: item.id, referencia: item.referencia, tipo: item.tipo, cantidad_usada: cantidad }];
    });
  };

  /** ---------------- Reducir cantidad stock asignado (-) ---------------- **/
  const handleSubtractStock = (item, cantidad) => {
    if (!cantidad || cantidad <= 0) return;

    const asignado = stockAsignado.find((s) => s.stock_id === item.stock_id);
    if (!asignado) return;

    let nuevaCantidad = asignado.cantidad_usada - cantidad;
    if (nuevaCantidad <= 0) {
      handleRemoveStock(item.stock_id);
    } else {
      setStockAsignado((prev) =>
        prev.map((s) =>
          s.stock_id === item.stock_id ? { ...s, cantidad_usada: nuevaCantidad } : s
        )
      );
      setStockDisponible((prev) =>
        prev.map((s) => (s.id === item.stock_id ? { ...s, cantidad: s.cantidad + cantidad } : s))
      );
    }
  };

  /** ---------------- Quitar stock completamente ---------------- **/
  const handleRemoveStock = (stock_id) => {
    const removed = stockAsignado.find((s) => s.stock_id === stock_id);
    if (!removed) return;

    setStockAsignado((prev) => prev.filter((s) => s.stock_id !== stock_id));
    setStockDisponible((prev) =>
      prev.map((s) => (s.id === stock_id ? { ...s, cantidad: s.cantidad + removed.cantidad_usada } : s))
    );
  };

  /** ---------------- Guardar cambios localmente ---------------- **/
  const handleSaveStockAsignado = () => {
    setOpenAsignarStockModal(false);
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

        <Table rows={pedidos} columns={columns} onRowClick={handleRowClick} compact />
      </Box>

      {/* Modal Crear/Editar Pedido */}
      <Dialog open={openPedidoModal} onClose={() => setOpenPedidoModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>{editingPedido ? "Editar Pedido" : "Nuevo Pedido"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Autocomplete
                options={clientes}
                getOptionLabel={(option) => option.nombre}
                value={clientes.find((c) => c.id === newPedido.cliente_id) || null}
                onChange={(e, value) => setNewPedido({ ...newPedido, cliente_id: value ? value.id : null })}
                renderInput={(params) => <TextField {...params} label="Cliente" fullWidth margin="dense" size="small" />}
              />
              <Button variant="outlined" color="secondary" onClick={() => setOpenClienteModal(true)} sx={{ mt: 1 }}>
                Nuevo Cliente
              </Button>
            </Grid>
            {columns
              .filter((col) => col.accessorKey !== "nombre_cliente" && 
              col.accessorKey !== "stock" && 
              col.accessorKey !== "precio_stock" &&
              col.accessorKey !== "cobro_neto")
              .map((col) => (
                <Grid item xs={6} key={col.accessorKey}>
                  {col.accessorKey.includes("fecha") ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label={col.header}
                        value={newPedido[col.accessorKey] ? dayjs(newPedido[col.accessorKey]) : null}
                        onChange={(value) => handleDateChange(col.accessorKey, value)}
                        format="DD/MM/YYYY"
                        slotProps={{ textField: { fullWidth: true, margin: "dense", size: "small" } }}
                      />
                    </LocalizationProvider>
                  ) : (
                    <TextField label={col.header} name={col.accessorKey} fullWidth value={newPedido[col.accessorKey] || ""} onChange={handleChange} margin="dense" size="small" />
                  )}
                </Grid>
              ))}
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => handleOpenAsignarStock(editingPedido)}>
              {editingPedido ? "Editar Stock" : "Asignar Stock"}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPedidoModal(false)}>Cancelar</Button>
          {editingPedido && <Button variant="outlined" color="error" onClick={handleDeletePedido}>Eliminar</Button>}
          <Button variant="contained" color="primary" onClick={handleSubmitPedido}>{editingPedido ? "Guardar cambios" : "Crear"}</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Nuevo Cliente */}
      <Dialog open={openClienteModal} onClose={() => setOpenClienteModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Nuevo Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Nombre" fullWidth value={newCliente.nombre} onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })} margin="dense" size="small" /></Grid>
            <Grid item xs={12}><TextField label="Localización" fullWidth value={newCliente.localizacion} onChange={(e) => setNewCliente({ ...newCliente, localizacion: e.target.value })} margin="dense" size="small" /></Grid>
            <Grid item xs={12}><TextField label="Contacto" fullWidth value={newCliente.contacto} onChange={(e) => setNewCliente({ ...newCliente, contacto: e.target.value })} margin="dense" size="small" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClienteModal(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSubmitCliente}>Crear Cliente</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ver Stock */}
      <Dialog open={openStockModal} onClose={() => setOpenStockModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Stock del Pedido #{stockModalPedido?.numero_serie || ""}</DialogTitle>
        <DialogContent>
          {stockItems.length > 0 ? (
            <MuiTable size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Referencia</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Cantidad usada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.referencia}</TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell>{item.cantidad_usada}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </MuiTable>
          ) : (<Typography>No hay stock usado en este pedido.</Typography>)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStockModal(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Asignar/Editar Stock */}
      <Dialog
        open={openAsignarStockModal}
        onClose={() => setOpenAsignarStockModal(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          {editingPedido ? "Editar Stock" : "Asignar Stock"} para Pedido #{editingPedido?.numero_serie || ""}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "nowrap" }}>
            {/* Stock Utilizado */}
            <Paper
              variant="outlined"
              sx={{ flex: 1, p: 2, maxHeight: 600, overflowY: "auto" }}
            >
              <Typography variant="h6" gutterBottom>
                Stock Utilizado
              </Typography>
              {stockAsignado.length > 0 ? (
                <MaterialReactTable
                  columns={[
                    { accessorKey: "referencia", header: "Referencia", enableColumnFilter: true },
                    { accessorKey: "tipo", header: "Tipo", enableColumnFilter: true },
                    { accessorKey: "cantidad_usada", header: "Cantidad", enableColumnFilter: true },
                    {
                      id: "acciones",
                      header: "Acciones",
                      Cell: ({ row }) => (
                        <Box display="flex" gap={1}>
                          <Button size="small" onClick={() => handleSubtractStock(row.original, 1)}>
                            -
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveStock(row.original.stock_id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ),
                      enableColumnFilter: false,
                    },
                  ]}
                  data={stockAsignado}
                  enableColumnFilters
                  enableGlobalFilter={false}
                  enablePagination={false}
                  muiTableContainerProps={{ sx: { maxHeight: 500, overflowY: "auto" } }}
                  layoutMode="grid"
                />
              ) : (
                <Typography>No hay stock asignado aún.</Typography>
              )}
            </Paper>

            {/* Stock Disponible */}
            <Paper
              variant="outlined"
              sx={{ flex: 1, p: 2, maxHeight: 600, overflowY: "auto" }}
            >
              <Typography variant="h6" gutterBottom>
                Stock Disponible
              </Typography>
              {stockDisponible.length > 0 ? (
                <MaterialReactTable
                  columns={[
                    { accessorKey: "referencia", header: "Referencia", enableColumnFilter: true },
                    { accessorKey: "tipo", header: "Tipo", enableColumnFilter: true },
                    { accessorKey: "cantidad", header: "Cantidad disponible", enableColumnFilter: true },
                    {
                      id: "cantidad_a_asignar",
                      header: "Cantidad a asignar",
                      Cell: ({ row }) => (
                        <TextField
                          type="number"
                          size="small"
                          defaultValue={1}
                          onChange={(e) => (row.original._cantidad = Number(e.target.value))}
                          sx={{ width: 60 }}
                        />
                      ),
                      enableColumnFilter: false,
                    },
                    {
                      id: "acciones",
                      header: "Acciones",
                      Cell: ({ row }) => (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAddStock(row.original, row.original._cantidad || 1)}
                        >
                          +
                        </Button>
                      ),
                      enableColumnFilter: false,
                    },
                  ]}
                  data={stockDisponible}
                  enableColumnFilters
                  enableGlobalFilter={false}
                  enablePagination={false}
                  muiTableContainerProps={{ sx: { maxHeight: 500, overflowY: "auto" } }}
                  layoutMode="grid"
                />
              ) : (
                <Typography>No hay stock disponible.</Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAsignarStockModal(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveStockAsignado}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>





      {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
    </Box>
  );
}

export default PedidosList;
