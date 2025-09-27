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
  Snackbar,
  Alert,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";

dayjs.locale("es");

function StockList() {
  const [stock, setStock] = useState([]);
  const [columns, setColumns] = useState([]);
  const [openStockModal, setOpenStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [newStock, setNewStock] = useState({ fecha_actual: dayjs().format("YYYY-MM-DD"), detalles: {} });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // --- Modal detalles ---
  const [openDetallesModal, setOpenDetallesModal] = useState(false);
  const [detallesArray, setDetallesArray] = useState([]);

  // --- Modal ver detalles ---
  const [openVerDetalles, setOpenVerDetalles] = useState(false);
  const [detallesView, setDetallesView] = useState({});

  const token = localStorage.getItem("token");

  // -------------------- FETCH STOCK --------------------
  const fetchStock = async () => {
    try {
      const res = await api.get("/stock", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;

      if (data.length > 0) {
        const cols = Object.keys(data[0])
          .filter((key) => key !== "id" && key !== "detalles")
          .map((key) => ({
            accessorKey: key,
            id: key,
            header: key === "cantidad" ? "CANTIDAD DISPONIBLE" : key.replace(/_/g, " ").toUpperCase(),
            Cell:
              key === "precio"
                ? ({ row }) => (row.original[key] != null ? `${row.original[key]} €` : "")
                : key === "precio_unidad"
                ? ({ row }) => (row.original[key] != null ? `${row.original[key]} €/u` : "")
                : undefined,
          }));

        cols.push({
          accessorKey: "detalles",
          id: "detalles",
          header: "DETALLES",
          Cell: ({ row }) => (
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setDetallesView(row.original.detalles || {});
                setOpenVerDetalles(true);
              }}
            >
              <VisibilityIcon />
            </IconButton>
          ),
        });

        setColumns(cols);
      }

      setStock(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [token]);

  // -------------------- HANDLERS --------------------
  const handleChange = (e) => setNewStock({ ...newStock, [e.target.name]: e.target.value });

  const handleDateChange = (name, value) => {
    setNewStock({ ...newStock, [name]: value ? dayjs(value).format("YYYY-MM-DD") : null });
  };

  const handleRowClick = (item) => {
    setEditingStock(item);
    setNewStock({ ...item, detalles: item.detalles || {} });

    // Preparamos array de detalles para modal
    const arr = Object.entries(item.detalles || {}).map(([key, value]) => ({ key, value }));
    setDetallesArray(arr);

    setOpenStockModal(true);
  };

  const handleSubmitStock = async () => {
    try {
      const detallesObj = {};
      detallesArray.forEach((item) => {
        if (item.key.trim() !== "") detallesObj[item.key] = item.value;
      });

      const payload = { ...newStock, detalles: detallesObj };

      ["fecha_actual", "fecha_compra"].forEach((f) => {
        if (payload[f]) payload[f] = dayjs(payload[f]).format("YYYY-MM-DD");
      });

      if (editingStock) {
        await api.put(`/stock/${editingStock.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setSnackbar({ open: true, message: "Stock actualizado correctamente", severity: "success" });
      } else {
        await api.post("/stock/", payload, { headers: { Authorization: `Bearer ${token}` } });
        setSnackbar({ open: true, message: "Stock creado correctamente", severity: "success" });
      }

      fetchStock();
      setOpenStockModal(false);
      setNewStock({ fecha_actual: dayjs().format("YYYY-MM-DD"), detalles: {} });
      setDetallesArray([]);
      setEditingStock(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al guardar stock", severity: "error" });
    }
  };

  const handleDeleteStock = async () => {
    try {
      if (!editingStock) return;
      await api.delete(`/stock/${editingStock.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "Stock eliminado correctamente", severity: "success" });
      setOpenStockModal(false);
      fetchStock();
      setNewStock({ fecha_actual: dayjs().format("YYYY-MM-DD"), detalles: {} });
      setDetallesArray([]);
      setEditingStock(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al eliminar stock", severity: "error" });
    }
  };

  // -------------------- DETALLES --------------------
  const handleDetalleChange = (index, field, value) => {
    const copy = [...detallesArray];
    copy[index][field] = value;
    setDetallesArray(copy);
  };

  const handleAddDetalle = () => {
    setDetallesArray([...detallesArray, { key: "", value: "" }]);
  };

  const handleRemoveDetalle = (index) => {
    const copy = [...detallesArray];
    copy.splice(index, 1);
    setDetallesArray(copy);
  };

    const renderDetallesForm = () => (
    <Box sx={{ mt: 1 }}>
        {detallesArray.map((item, index) => (
        <Grid container spacing={1} alignItems="center" key={index} sx={{ mb: 1 }}>
            <Grid item xs={5}>
            <TextField
                label="Clave"
                fullWidth
                size="small"
                value={item.key}
                onChange={(e) => handleDetalleChange(index, "key", e.target.value)}
            />
            </Grid>
            <Grid item xs={5}>
            <TextField
                label="Valor"
                fullWidth
                size="small"
                value={item.value}
                onChange={(e) => handleDetalleChange(index, "value", e.target.value)}
            />
            </Grid>
            <Grid item xs={2} sx={{ display: "flex", justifyContent: "center" }}>
            <IconButton
                onClick={() => handleRemoveDetalle(index)}
                sx={{ border: "1px solid #ccc", borderRadius: "50%", p: 0.5 }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
            </Grid>
        </Grid>
        ))}
        <Button variant="outlined" onClick={handleAddDetalle}>
        + Añadir campo
        </Button>
    </Box>
    );


  // -------------------- RENDER --------------------
  return (
    <Box sx={{ backgroundColor: "#f4f6f8", minHeight: "100vh", p: 3 }}>
      <Box sx={{ backgroundColor: "white", borderRadius: 2, p: 3, boxShadow: 2 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: 16 }}>Stock</h2>

        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setEditingStock(null);
            setNewStock({ fecha_actual: dayjs().format("YYYY-MM-DD"), detalles: {} });
            setDetallesArray([]);
            setOpenStockModal(true);
          }}
          sx={{ mb: 2 }}
        >
          Añadir Stock
        </Button>

        <Table rows={stock} columns={columns} onRowClick={handleRowClick} />
      </Box>

      {/* Modal Crear/Editar Stock */}
      <Dialog open={openStockModal} onClose={() => setOpenStockModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingStock ? "Editar Stock" : "Nuevo Stock"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {columns
              .filter((col) => col.accessorKey !== "precio_unidad" && col.accessorKey !== "detalles")
              .map((col) => (
                <Grid item xs={6} key={col.accessorKey}>
                  {col.accessorKey.includes("fecha") ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label={col.header}
                        value={newStock[col.accessorKey] ? dayjs(newStock[col.accessorKey]) : null}
                        onChange={(value) => handleDateChange(col.accessorKey, value)}
                        format="DD/MM/YYYY"
                        slotProps={{ textField: { fullWidth: true, margin: "dense", size: "small" } }}
                      />
                    </LocalizationProvider>
                  ) : (
                    <TextField
                      label={col.header}
                      name={col.accessorKey}
                      fullWidth
                      value={newStock[col.accessorKey] || ""}
                      onChange={handleChange}
                      margin="dense"
                      size="small"
                    />
                  )}
                </Grid>
              ))}
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setOpenDetallesModal(true)}
            >
              {detallesArray.length > 0 ? "Editar Detalles" : "Añadir Detalles"}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStockModal(false)}>Cancelar</Button>
          {editingStock && (
            <Button variant="outlined" color="error" onClick={handleDeleteStock}>
              Eliminar
            </Button>
          )}
          <Button variant="contained" color="primary" onClick={handleSubmitStock}>
            {editingStock ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalles */}
      <Dialog open={openDetallesModal} onClose={() => setOpenDetallesModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles del Stock</DialogTitle>
        <DialogContent>{renderDetallesForm()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetallesModal(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={() => {
            const detallesObj = {};
            detallesArray.forEach((item) => {
              if (item.key.trim() !== "") detallesObj[item.key] = item.value;
            });
            setNewStock({ ...newStock, detalles: detallesObj });
            setOpenDetallesModal(false);
          }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ver Detalles */}
      <Dialog open={openVerDetalles} onClose={() => setOpenVerDetalles(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalles del Stock</DialogTitle>
        <DialogContent>
          {Object.keys(detallesView || {}).length === 0 ? (
            <Typography color="text.secondary">Este stock no tiene detalles.</Typography>
          ) : (
            <Grid container spacing={2}>
              {Object.entries(detallesView).map(([key, value]) => (
                <Grid item xs={6} key={key}>
                  <Typography variant="subtitle2">{key}</Typography>
                  <Typography variant="body2" color="text.secondary">{value}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVerDetalles(false)}>Cerrar</Button>
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

export default StockList;
