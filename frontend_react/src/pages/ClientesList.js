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
} from "@mui/material";

function ClientesList() {
  const [clientes, setClientes] = useState([]);
  const [columns, setColumns] = useState([]);
  const [openClienteModal, setOpenClienteModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [newCliente, setNewCliente] = useState({ nombre: "", localizacion: "", contacto: "", categoria: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const token = localStorage.getItem("token");

  const fetchClientes = async () => {
    try {
      const res = await api.get("/clientes/", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;

      if (data.length > 0) {
        // columnas dinámicas excepto id
        const cols = Object.keys(data[0])
          .filter((key) => key !== "id")
          .map((key) => ({ accessorKey: key, id: key, header: key.replace(/_/g, " ").toUpperCase() }));
        setColumns(cols);
      }

      setClientes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchClientes(); }, [token]);

  const handleChange = (e) => setNewCliente({ ...newCliente, [e.target.name]: e.target.value });

  const handleRowClick = (cliente) => {
    setEditingCliente(cliente);
    setNewCliente({ ...cliente });
    setOpenClienteModal(true);
  };

  const handleSubmitCliente = async () => {
    try {
      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, newCliente, { headers: { Authorization: `Bearer ${token}` } });
        setClientes(prev => prev.map(c => c.id === editingCliente.id ? { ...c, ...newCliente } : c));
        setSnackbar({ open: true, message: "Cliente actualizado correctamente", severity: "success" });
      } else {
        const res = await api.post("/clientes/", newCliente, { headers: { Authorization: `Bearer ${token}` } });
        setClientes(prev => [...prev, res.data]);
        setSnackbar({ open: true, message: "Cliente creado correctamente", severity: "success" });
      }
      setOpenClienteModal(false);
      setNewCliente({ nombre: "", localizacion: "", contacto: "", categoria: "" });
      setEditingCliente(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al guardar cliente", severity: "error" });
    }
  };

  const handleDeleteCliente = async () => {
    try {
      if (!editingCliente) return;
      await api.delete(`/clientes/${editingCliente.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setClientes(prev => prev.filter(c => c.id !== editingCliente.id));
      setSnackbar({ open: true, message: "Cliente eliminado correctamente", severity: "success" });
      setOpenClienteModal(false);
      setNewCliente({ nombre: "", localizacion: "", contacto: "", categoria: "" });
      setEditingCliente(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al eliminar cliente", severity: "error" });
    }
  };

  return (
    <Box sx={{ backgroundColor: "#f4f6f8", minHeight: "100vh", p: 3 }}>
      <Box sx={{ backgroundColor: "white", borderRadius: 2, p: 3, boxShadow: 2 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: 16 }}>Clientes</h2>

        <Button
          variant="contained"
          color="primary"
          onClick={() => { setEditingCliente(null); setNewCliente({ nombre: "", localizacion: "", contacto: "", categoria: "" }); setOpenClienteModal(true); }}
          sx={{ mb: 2 }}
        >
          Añadir Cliente
        </Button>

        <Table rows={clientes} columns={columns} onRowClick={handleRowClick} compact />
      </Box>

      {/* Modal Crear/Editar Cliente */}
      <Dialog open={openClienteModal} onClose={() => setOpenClienteModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>{editingCliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {["nombre", "localizacion", "contacto", "categoria"].map((field) => (
              <Grid item xs={12} key={field}>
                <TextField
                  label={field.charAt(0).toUpperCase() + field.slice(1)}
                  name={field}
                  fullWidth
                  value={newCliente[field] || ""}
                  onChange={handleChange}
                  margin="dense"
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClienteModal(false)}>Cancelar</Button>
          {editingCliente && <Button variant="outlined" color="error" onClick={handleDeleteCliente}>Eliminar</Button>}
          <Button variant="contained" color="primary" onClick={handleSubmitCliente}>
            {editingCliente ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default ClientesList;
