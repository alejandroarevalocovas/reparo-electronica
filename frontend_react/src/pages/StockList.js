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
  const [touchedFields, setTouchedFields] = useState({});

  // --- Modal detalles ---
  const [openDetallesModal, setOpenDetallesModal] = useState(false);
  const [detallesArray, setDetallesArray] = useState([]);

  // --- Modal ver detalles ---
  const [openVerDetalles, setOpenVerDetalles] = useState(false);
  const [detallesView, setDetallesView] = useState({});

  // --- Modal confirmar eliminacion ---
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  const token = localStorage.getItem("token");

  // -------------------- FETCH STOCK --------------------
  const fetchStock = async () => {
    try {
      const res = await api.get("/stock", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      //console.log("DATA",data)
      if (data.length > 0) {
        const order = [
          "referencia", "tipo", "formato", "fecha_actual", "cantidad_total", "cantidad",
          "precio", "precio_unidad", "fecha_compra", "estado", "ubicacion", "visto_en", "enlace_compra", "comentarios"
        ];

        const cols = order.map((key) => ({
          accessorKey: key,
          id: key,
          header:
            key === "cantidad_total"
              ? "CANTIDAD COMPRADA"
              : key === "cantidad"
              ? "CANTIDAD DISPONIBLE"
              : key.replace(/_/g, " ").toUpperCase(),
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
      setTouchedFields({});
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

  const handleAddDetalle = () => setDetallesArray([...detallesArray, { key: "", value: "" }]);
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
            setTouchedFields({});
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
            {[
              { key: "referencia", label: "Referencia", required: true },
              { key: "tipo", label: "Tipo", required: true },
              { key: "formato", label: "Formato" },
              { key: "fecha_actual", label: "Fecha Actual", type: "date" },
              { key: "cantidad_total", label: "Cantidad Comprada", required: true },
              { key: "cantidad", label: "Cantidad Disponible", required: true },
              { key: "precio", label: "Precio (€)", required: true },
             // { key: "precio_unidad", label: "Precio Unidad" },
              { key: "fecha_compra", label: "Fecha Compra", type: "date" },
              { key: "estado", label: "Estado" },
              { key: "ubicacion", label: "Ubicación" },
              { key: "visto_en", label: "Visto En" },
              { key: "enlace_compra", label: "Enlace Compra" },
              { key: "comentarios", label: "Comentarios", multiline: true, minRows: 3, sx: '400px' },
            ].map((field) => (
              <Grid item xs={field.multiline ? 12 : 6} key={field.key}>
                {field.type === "date" ? (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      label={field.label}
                      value={newStock[field.key] ? dayjs(newStock[field.key]) : null}
                      onChange={(value) => handleDateChange(field.key, value)}
                      format="DD/MM/YYYY"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: "dense",
                          size: "small",
                          required: field.required,
                          error: touchedFields[field.key] && !newStock[field.key],
                          helperText:
                            touchedFields[field.key] && !newStock[field.key]
                              ? "Este campo es obligatorio"
                              : "",
                        },
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <TextField
                    label={field.label}
                    name={field.key}
                    fullWidth
                    value={newStock[field.key] || ""}
                    onChange={handleChange}
                    margin="dense"
                    size="small"
                    multiline={field.multiline || false}
                    minRows={field.minRows || 1}
                    required={field.required || false}
                    error={touchedFields[field.key] && field.required && !newStock[field.key]}
                    helperText={
                      touchedFields[field.key] && field.required && !newStock[field.key]
                        ? "Este campo es obligatorio"
                        : ""
                    }
                    sx={ field.sx ? { minWidth: field.sx } : {}}
                  />
                )}
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => setOpenDetallesModal(true)}>
              {detallesArray.length > 0 ? "Editar Detalles" : "Añadir Detalles"}
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenStockModal(false)}>Cancelar</Button>
          {editingStock && (
            <Button
                variant="outlined"
                color="error"
                onClick={() => setOpenDeleteConfirm(true)}
            >
                Eliminar
            </Button>
            )}
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const requiredFields = ["referencia", "tipo", "precio", "cantidad_total","cantidad"];
              let newTouched = {};
              requiredFields.forEach((f) => (newTouched[f] = true));
              setTouchedFields(newTouched);

              for (const field of requiredFields) {
                if (!newStock[field]) {
                  setSnackbar({
                    open: true,
                    message: `El campo "${field.charAt(0).toUpperCase() + field.slice(1)}" es obligatorio`,
                    severity: "error",
                  });
                  return;
                }
              }

              handleSubmitStock();
            }}
          >
            {editingStock ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

    {/* Modal confirmacion eliminacion stock */}
      <Dialog
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        maxWidth="xs"
        fullWidth
        >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
            <Typography>
            ¿Estás seguro de que deseas eliminar el stock "{editingStock?.referencia}"?
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenDeleteConfirm(false)}>Cancelar</Button>
            <Button
            variant="contained"
            color="error"
            onClick={() => {
                handleDeleteStock();
                setOpenDeleteConfirm(false);
            }}
            >
            Confirmar
            </Button>
        </DialogActions>
        </Dialog>


      {/* Modal Detalles */}
      <Dialog open={openDetallesModal} onClose={() => setOpenDetallesModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles del Stock</DialogTitle>
        <DialogContent>{renderDetallesForm()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetallesModal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const detallesObj = {};
              detallesArray.forEach((item) => {
                if (item.key.trim() !== "") detallesObj[item.key] = item.value;
              });
              setNewStock({ ...newStock, detalles: detallesObj });
              setOpenDetallesModal(false);
            }}
          >
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
                  <Typography variant="body2" color="text.secondary">
                    {value}
                  </Typography>
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

export default StockList;
