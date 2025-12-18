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
  Menu,
  MenuItem,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import DeleteIcon from "@mui/icons-material/Delete";
import { Visibility } from "@mui/icons-material";
dayjs.locale("es");

const ESTADOS = [
  { value: "Fase Inicial - Recibido / Pendiente de diagnóstico", label: "Recibido / Pendiente de diagnóstico: El equipo ha sido recibido y está en la cola para ser revisado. Es el punto de partida." },
  { value: "En diagnóstico", label: "Has empezado a trabajar activamente en el equipo para identificar el problema." },
  { value: "Esperando aprobación de presupuesto", label: "Has diagnosticado el problema, has generado un presupuesto y estás esperando la confirmación del cliente para proceder." },
  { value: "Esperando piezas / componentes", label: "El cliente ha aprobado, pero necesitas material para continuar." },
  { value: "En proceso de reparación", label: "El cliente ha aprobado y tienes las piezas. Estás trabajando activamente en la solución." },
  { value: "Reparación finalizada / Listo para entregar", label: "Has terminado todo el trabajo técnico. Solo falta que el cliente lo recoja o se lo envíes." },
  { value: "Avisado / Listo para recogida", label: "Has contactado con el cliente para informarle de que su equipo está listo." },
  { value: "Entregado / Cerrado", label: "El cliente ha recogido el equipo, ha pagado y se puede archivar la orden." },
  { value: "Sin reparación (Presupuesto no aprobado)", label: "El cliente ha rechazado el presupuesto. El equipo está pendiente de recogida o devolución." },
  { value: "Irreparable", label: "Determinas que el equipo no se puede reparar (coste, piezas, daño catastrófico, etc.)." },
  { value: "Entregado sin reparar", label: "El cliente ha recogido el equipo tras no aprobar el presupuesto o ser irreparable." },
];

const TIPO_COBRO = ["Cash", "Bizum", "Transferencia"];

function PedidosList() {
  const [pedidos, setPedidos] = useState([]);
  const [columns, setColumns] = useState([]);
  const [openPedidoModal, setOpenPedidoModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [newPedido, setNewPedido] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [touchedFields, setTouchedFields] = useState({});


  // Modal ver stock
  const [openStockModal, setOpenStockModal] = useState(false);
  const [stockModalPedido, setStockModalPedido] = useState(null);
  const [stockItems, setStockItems] = useState([]);

  // Modal asignar/editar stock
  const [openAsignarStockModal, setOpenAsignarStockModal] = useState(false);
  const [stockAsignado, setStockAsignado] = useState([]);
  const [stockDisponible, setStockDisponible] = useState([]);

  //Modal info estado
  const [openEstadoInfo, setOpenEstadoInfo] = useState(false);

  //Modal confirmar eliminacion
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  //Menu contextual
  const [contextMenu, setContextMenu] = useState(null);
  const [contextPedido, setContextPedido] = useState(null);

  //Clientes
  const [clientes, setClientes] = useState([]); // lista de clientes
  const [openClienteModal, setOpenClienteModal] = useState(false);
  const [newCliente, setNewCliente] = useState({ nombre: "", localizacion: "", contacto: "", categoria: "", contacta_por: "" });
  const [clienteInfo, setClienteInfo] = useState(null); // para mostrar en el modal
  const [openClienteInfo, setOpenClienteInfo] = useState(false); // control del modal

  //Stock nuevo
  const [openNuevoStockModal, setOpenNuevoStockModal] = useState(false);
  const [nuevoStock, setNuevoStock] = useState({
    referencia: "",
    tipo: "",
    cantidad: "",
    cantidad_total: "",
    precio: "",
  });
  const [erroresNuevoStock, setErroresNuevoStock] = useState({});

  const token = localStorage.getItem("token");

  /** ---------------- Fetch pedidos ---------------- **/
  const fetchPedidos = async () => {
    try {
      const res = await api.get("/pedidos/", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      //console.log("DATAAAAAAAAAAA",res.data)
      if (data.length > 0) {
        const cols = Object.keys(data[0])
          .filter((key) => key !== "id" && key !== "cliente_id" && key != "precio_total")
          .map((key) => {
            let Cell = undefined;

            if (key === "precio" || key === "precio_stock" || key === "cobro_neto" || key === "pendiente_pago") {
              Cell = ({ row }) => {
                const value = row.original[key];
                return `${value != null ? value : 0} €`; // si es null o undefined, mostrar 0
              };
            } else if (key === "tiempo_reparacion") {
              Cell = ({ row }) => row.original[key] != null ? `${row.original[key]} min` : "";
            } else if (key === "garantia") {
              Cell = ({ row }) => (row.original.garantia ? "Sí" : "No");
            } else if (key === "tiempo_garantia") {
              Cell = ({ row }) => {
                const { fecha_pagado, tiempo_garantia } = row.original;
                if (!fecha_pagado || !tiempo_garantia) return "Garantía no empezada";

                const fechaInicio = dayjs(fecha_pagado);
                const fechaFin = fechaInicio.add(tiempo_garantia, "month");
                const diffDays = fechaFin.diff(dayjs(), "day");

                if (diffDays <= 0) return "Garantía vencida";

                if (diffDays > 30) {
                  const meses = Math.floor(diffDays / 30);
                  const dias = diffDays % 30;
                  const mesesText = meses === 1 ? "1 mes" : `${meses} meses`;
                  const diasText = dias === 1 ? "1 día" : dias > 0 ? `${dias} días` : "";
                  return diasText ? `${mesesText} y ${diasText}` : mesesText;
                } else {
                  return diffDays === 1 ? "1 día" : `${diffDays} días`;
                }
              };
            }


            let header;
            if (key === "precio") {
              header = "COBRADO";
            } 
            else if (key === "garantia") {
              header = "EN GARANTIA";
            } else {
              header = key.replace(/_/g, " ").toUpperCase();
            }

            return { accessorKey: key, id: key, header, Cell };
          });

        // Añadir columna Stock como antes
        cols.push({
          accessorKey: "stock",
          id: "stock",
          header: "STOCK",
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

        const COLUMN_ORDER = [
          "fecha_entrada",
          "equipo",
          "numero_serie",
          "part_number",
          "problema",
          "estado",
          "comentarios",
          "fecha_reparacion",
          "fecha_pagado",
          "tiempo_reparacion",
          "precio",
          "tipo_cobro",
          "pendiente_pago",
          "garantia",
          "tiempo_garantia",
          "precio_stock",
          "cobro_neto",
          "stock",
        ];

        const orderedCols = COLUMN_ORDER
          .map((id) => cols.find((c) => c.id === id))
          .filter(Boolean);

        setColumns(orderedCols);
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

  // 👉 handler para ver cliente
  const handleViewCliente = () => {
    if (!newPedido.cliente_id) return; // no hay cliente seleccionado
    const cliente = clientes.find(c => c.id === newPedido.cliente_id);
    if (cliente) {
      setClienteInfo(cliente);
      setOpenClienteInfo(true);
    }
  };

  const handleChange = (e) => setNewPedido({ ...newPedido, [e.target.name]: e.target.value });
  const handleDateChange = (name, value) => {
    setNewPedido({ ...newPedido, [name]: value ? dayjs(value).format("YYYY-MM-DD") : null });
  };

  const handleRowClick = (pedido) => {
    setEditingPedido(pedido);

    setNewPedido({
      ...pedido,
      cliente_id: pedido.cliente_id,
      precio: pedido.precio ?? 0, // 👈 si es null/undefined, lo forzamos a 0
    });

    setOpenPedidoModal(true);
  };

  /** ---------------- Crear/Editar Pedido ---------------- **/
  const handleSubmitPedido = async () => {
    // Campos obligatorios
    const requiredFields = ["cliente_id", "numero_serie", "equipo", "problema", "precio","precio_total", "fecha_entrada"];
    if (newPedido.fecha_pagado) requiredFields.push("tiempo_garantia");
    // Marcar todos los campos obligatorios como "touched" al intentar guardar
    let newTouched = {};
    requiredFields.forEach(f => { newTouched[f] = true; });
    setTouchedFields(newTouched);

    // Validación: si falta algún campo, mostrar snackbar y salir
    for (const field of requiredFields) {
      if (
        newPedido[field] === null ||
        newPedido[field] === undefined ||
        newPedido[field] === ""
      ) {
        setSnackbar({ 
          open: true, 
          message: `El campo "${field.replace(/_/g, ' ')}" es obligatorio`, 
          severity: "error" 
        });
        return;
      }
    }

    if (parseFloat(newPedido.precio) > parseFloat(newPedido.precio_total)) {
      setSnackbar({
        open: true,
        message: "El importe cobrado no puede ser mayor que el cobro total.",
        severity: "error",
      });
      return; // detenemos la ejecución, no guarda
    }

    try {
      const payload = { ...newPedido, stocks: stockAsignado };
      delete payload.nombre_cliente;
      ["fecha_entrada", "fecha_reparacion", "fecha_pagado"].forEach((f) => {
        if (payload[f]) payload[f] = dayjs(payload[f]).format("YYYY-MM-DD");
      });
      //console.log("PAYLOADDDDD",payload)

      if (editingPedido) {
        await api.put(`/pedidos/${editingPedido.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchPedidos();
        setSnackbar({ open: true, message: "Pedido actualizado correctamente", severity: "success" });
      } else {
        await api.post("/pedidos/", payload, { headers: { Authorization: `Bearer ${token}` } });
        await fetchPedidos();
        setSnackbar({ open: true, message: "Pedido creado correctamente", severity: "success" });
      }

      // Resetar estado del modal
      setOpenPedidoModal(false);
      setNewPedido({});
      setEditingPedido(null);
      setStockAsignado([]);
      setStockDisponible([]);
      setTouchedFields({}); // reset touched fields después de guardar
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Error al guardar pedido", severity: "error" });
    }
  };

  /** ---------------- Colorear fila si garantia true ---------------- **/
  const rowProps = (row) => ({
    sx: {
      backgroundColor: row.original.garantia ? "#ebdd5cff" : "inherit",
    },
  });


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

  const handleRowRightClick = (e, pedido) => {
    e.preventDefault();
    setContextPedido(pedido);
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX + 2, mouseY: e.clientY - 6 }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCopyPedido = (pedido) => {
    const { id, fecha_reparacion, fecha_pagado, ...pedidoToCopy } = pedido;

    setNewPedido({
      ...pedidoToCopy,
      cliente_id: pedido.cliente_id,
      precio: pedidoToCopy.precio ?? 0,
    });

    setEditingPedido(null);
    setStockAsignado([]);
    setOpenPedidoModal(true);
  };



  /** ---------------- Nuevo Cliente ---------------- **/
  const handleSubmitCliente = async () => {
    try {
      const res = await api.post("/clientes/", newCliente, { headers: { Authorization: `Bearer ${token}` } });
      setClientes([...clientes, res.data]);
      setNewPedido({ ...newPedido, cliente_id: res.data.id });
      setSnackbar({ open: true, message: "Cliente creado correctamente", severity: "success" });
      setOpenClienteModal(false);
      setNewCliente({ nombre: "", localizacion: "", contacto: "", categoria: "", contacta_por: "" });
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
        //console.log("DATA stock asignado",data)
        const mapped = data.map((s) => {
          const stockItem = stockData.find(sd => sd.referencia === s.referencia && sd.tipo === s.tipo);
          return { ...s, stock_id: stockItem?.id || null };
        });
        //console.log("DATA stock asignado mapped",mapped)
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
      return [...prev, { stock_id: item.id, referencia: item.referencia, tipo: item.tipo, formato: item.formato, ubicacion: item.ubicacion,cantidad_usada: cantidad }];
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

   /** ---------------- Nuevo Stock ---------------- **/
  const handleCreateStock = async () => {
  try {
    const res = await api.post("/stock/", nuevoStock, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 🔥 Añadir nuevo stock a la lista de stock disponible (sin cerrar el modal de asignar stock)
    const nuevoStockCreado = res.data;
    setStockDisponible((prev) => [...prev, nuevoStockCreado]);

    // Mostrar mensaje de éxito
    setSnackbar({
      open: true,
      message: "Nuevo stock creado correctamente",
      severity: "success",
    });

    // Cerrar solo el modal de creación de stock, no el de asignación
    setOpenNuevoStockModal(false);

    // Limpiar campos
    setNuevoStock({
      referencia: "",
      tipo: "",
      cantidad: "",
      cantidad_total: "",
      precio: "",
    });
    setErroresNuevoStock({});
  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: "Error al crear el stock",
      severity: "error",
    });
  }
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

        <Table rows={pedidos} 
               columns={columns} 
               onRowClick={handleRowClick} 
               compact
               onRowContextMenu={handleRowRightClick} 
               rowPropsBackground={(row) => ({
                  sx: {
                    backgroundColor: row.original.garantia ? "#ebdd5cff" : "inherit",
                  },
                })}
               initialStateSorting={{
                  sorting: [{ id: "fecha_entrada", desc: true }],
                }}
        />
      </Box>

    {/* Menu copiar pedido */}
      <Menu
      open={contextMenu !== null}
      onClose={handleCloseContextMenu}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
    >
      <MenuItem
        onClick={() => {
          handleCopyPedido(contextPedido);
          handleCloseContextMenu();
        }}
      >
        Crear nuevo pedido a partir de este
      </MenuItem>
    </Menu>

      {/* Modal Crear/Editar Pedido */}
      <Dialog 
        open={openPedidoModal} 
        onClose={(event, reason) => {
          // Evita cierre al hacer click fuera del modal
          if (reason === "backdropClick") return;

          setOpenPedidoModal(false);
        }}
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>{editingPedido ? "Editar Pedido" : "Nuevo Pedido"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>

            {/* Numero de Serie */}
            <Grid item xs={6}>
              <TextField
                label="Número de Serie"
                name="numero_serie"
                fullWidth
                value={newPedido.numero_serie || ""}
                onChange={handleChange}
                margin="dense"
                size="small"
                required
                error={touchedFields.numero_serie && !newPedido.numero_serie}
                helperText={touchedFields.numero_serie && !newPedido.numero_serie ? "Este campo es obligatorio" : ""}
              />
            </Grid>

            {/* Part Number */}
            <Grid item xs={6}>
              <TextField
                label="Part Number"
                name="part_number"
                fullWidth
                value={newPedido.part_number || ""}
                onChange={handleChange}
                margin="dense"
                size="small"
              />
            </Grid>

            {/* Equipo */}
            <Grid item xs={6}>
              <TextField
                label="Equipo"
                name="equipo"
                fullWidth
                value={newPedido.equipo || ""}
                onChange={handleChange}
                margin="dense"
                size="small"
                required
                error={touchedFields.equipo && !newPedido.equipo}
                helperText={touchedFields.equipo && !newPedido.equipo ? "Este campo es obligatorio" : ""}
              />
            </Grid>

            {/* Problema */}
            <Grid item xs={6}>
              <TextField
                label="Problema"
                name="problema"
                fullWidth
                value={newPedido.problema || ""}
                onChange={handleChange}
                margin="dense"
                size="small"
                required
                error={touchedFields.problema && !newPedido.problema}
                helperText={touchedFields.problema && !newPedido.problema ? "Este campo es obligatorio" : ""}
              />
            </Grid>

            {/* Fecha Entrada */}
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <DatePicker
                  label="Fecha Entrada"
                  value={newPedido.fecha_entrada ? dayjs(newPedido.fecha_entrada) : null}
                  onChange={(value) => handleDateChange("fecha_entrada", value)}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: "dense",
                      size: "small",
                      required: true,
                      error: touchedFields.fecha_entrada && !newPedido.fecha_entrada,
                      helperText: touchedFields.fecha_entrada && !newPedido.fecha_entrada ? "Este campo es obligatorio" : "",
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Cliente */}
            <Grid item xs={6}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(option) => option.nombre}
                  value={clientes.find((c) => c.id === newPedido.cliente_id) || null}
                  onChange={(e, value) =>
                    setNewPedido({ ...newPedido, cliente_id: value ? value.id : null })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente"
                      fullWidth
                      margin="dense"
                      size="small"
                      required
                      error={touchedFields.cliente_id && !newPedido.cliente_id}
                      helperText={
                        touchedFields.cliente_id && !newPedido.cliente_id
                          ? "Este campo es obligatorio"
                          : ""
                      }
                      sx={{ minWidth: "200px" }}
                    />
                  )}
                  sx={{ flex: 1 }}
                />

                {/* 👁️ Botón de ver cliente */}
                <Button
                  onClick={handleViewCliente}
                  disabled={!newPedido.cliente_id}
                  sx={{ ml: 1, minWidth: "40px", height: "40px" }}
                >
                  <Visibility />
                </Button>
              </Box>

              {/* Botón para crear nuevo cliente debajo */}
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setOpenClienteModal(true)}
                sx={{ mt: 1 }}
              >
                Nuevo Cliente
              </Button>
            </Grid>

             {/* Cobro total */}
            <Grid item xs={6}>
              <TextField
                label="Cobro total"
                name="precio_total"
                fullWidth
                value={newPedido.precio_total ?? ""}
                onChange={handleChange}
                margin="dense"
                size="small"
                required
                error={touchedFields.precio_total && (newPedido.precio_total === "" || newPedido.precio_total === null || newPedido.precio_total === undefined)}
                helperText={touchedFields.precio_total && (newPedido.precio_total === "" || newPedido.precio_total === null || newPedido.precio_total === undefined) 
                  ? "Este campo es obligatorio" 
                  : ""}
              />
            </Grid>


            {/* Cobrado */}
            <Grid item xs={6}>
              <TextField
                label="Cobrado"
                name="precio"
                fullWidth
                value={newPedido.precio ?? ""}
                onChange={handleChange}
                margin="dense"
                size="small"
                required
                error={touchedFields.precio && (newPedido.precio === "" || newPedido.precio === null || newPedido.precio === undefined)}
                helperText={touchedFields.precio && (newPedido.precio === "" || newPedido.precio === null || newPedido.precio === undefined) 
                  ? "Este campo es obligatorio" 
                  : ""}
              />
            </Grid>

            {/* Tipo cobro */}
            <Grid item xs={6}>
            <TextField
              select
              label="Tipo cobro"
              name="tipo_cobro"
              value={newPedido.tipo_cobro || ""}
              onChange={handleChange}
              fullWidth
              margin="dense"
              size="small"
              sx={{ minWidth: '250px' }}
            >
              <MenuItem value="">Seleccione tipo de cobro</MenuItem>
                {TIPO_COBRO.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
          </Grid>

            {/* Fecha Pagado */}
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <DatePicker
                  label="Fecha Pagado"
                  value={newPedido.fecha_pagado ? dayjs(newPedido.fecha_pagado) : null}
                  onChange={(value) => handleDateChange("fecha_pagado", value)}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: { fullWidth: true, margin: "dense", size: "small" },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Garantía */}
            <Grid item xs={6}>
              <TextField
                select
                label="Garantía"
                name="garantia"
                value={newPedido.garantia ? "Sí" : "No"}
                onChange={(e) => setNewPedido({ ...newPedido, garantia: e.target.value === "Sí" })}
                fullWidth
                margin="dense"
                size="small"
                sx={{ minWidth: '200px' }}
              >
                <MenuItem value="Sí">Sí</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>

            {/* Tiempo Garantía */}
            <Grid item xs={6}>
              <TextField
                label="Tiempo Garantía (meses)"
                name="tiempo_garantia"
                type="number"
                value={newPedido.tiempo_garantia || ""}
                onChange={handleChange}
                fullWidth
                margin="dense"
                size="small"
                error={touchedFields.tiempo_garantia && !newPedido.tiempo_garantia && newPedido.fecha_pagado}
                helperText={touchedFields.tiempo_garantia && !newPedido.tiempo_garantia && newPedido.fecha_pagado ? "Obligatorio si fecha pagado existe" : ""}
              />
            </Grid>

            {/* Estado */}
            <Grid item xs={6}>
            <TextField
              select
              label="Estado"
              name="estado"
              value={newPedido.estado || ""}
              onChange={handleChange}
              fullWidth
              margin="dense"
              size="small"
              sx={{ minWidth: '400px' }}
            >
              <MenuItem value="">Seleccione estado</MenuItem>
              {ESTADOS.map((estado, idx) => (
                <MenuItem key={idx} value={estado.value}>
                  {estado.value}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

            {/* Fecha Reparacion */}
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <DatePicker
                  label="Fecha Reparación"
                  value={newPedido.fecha_reparacion ? dayjs(newPedido.fecha_reparacion) : null}
                  onChange={(value) => handleDateChange("fecha_reparacion", value)}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: { fullWidth: true, margin: "dense", size: "small" },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Tiempo Reparacion */}
            <Grid item xs={6}>
              <TextField
                label="Tiempo Reparación (min)"
                name="tiempo_reparacion"
                fullWidth
                value={newPedido.tiempo_reparacion || ""}
                onChange={handleChange}
                margin="dense"
                size="small"
              />
            </Grid>

            {/* Comentarios (larga y ancha) */}
            <Grid item xs={12}>
              <TextField
                label="Comentarios"
                name="comentarios"
                fullWidth
                multiline
                minRows={4}
                maxRows={10}
                value={newPedido.comentarios || ""}
                onChange={handleChange}
                margin="dense"
                size="small"
                sx={{ minWidth: '400px' }}
              />
            </Grid>

          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => handleOpenAsignarStock(editingPedido)}>
              {editingPedido ? "Editar Stock" : "Asignar Stock"}
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenPedidoModal(false)}>Cancelar</Button>
          {editingPedido && (
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
              // marcar todos los campos obligatorios como tocados al intentar enviar
              const requiredFields = ["cliente_id", "numero_serie", "equipo", "problema", "precio", "fecha_entrada"];
              let newTouched = {};
              requiredFields.forEach(f => { newTouched[f] = true; });
              setTouchedFields(newTouched);

              handleSubmitPedido();
            }}
          >
            {editingPedido ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal confirmar eliminacion */}

      <Dialog
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el pedido #{editingPedido?.numero_serie}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeletePedido();
              setOpenDeleteConfirm(false);
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

    {/* Modal Nuevo Cliente */}
    <Dialog 
      open={openClienteModal} 
      onClose={(event, reason) => {
        // Evita cierre al hacer click fuera del modal
        if (reason === "backdropClick") return;

        setOpenClienteModal(false);
      }}
      maxWidth="sm" 
      fullWidth 
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>{"Nuevo Cliente"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          {/* Nombre */}
          <Grid item xs={12}>
            <TextField
              label="Nombre"
              name="nombre"
              fullWidth
              value={newCliente.nombre || ""}
              onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
              margin="dense"
              size="small"
              required
              error={touchedFields.nombre && !newCliente.nombre}
              helperText={touchedFields.nombre && !newCliente.nombre ? "Este campo es obligatorio" : ""}
            />
          </Grid>

          {/* Localización */}
          <Grid item xs={12}>
            <TextField
              label="Localización"
              name="localizacion"
              fullWidth
              value={newCliente.localizacion || ""}
              onChange={(e) => setNewCliente({ ...newCliente, localizacion: e.target.value })}
              margin="dense"
              size="small"
            />
          </Grid>

          {/* Contacto */}
          <Grid item xs={12}>
            <TextField
              label="Contacto"
              name="contacto"
              fullWidth
              value={newCliente.contacto || ""}
              onChange={(e) => setNewCliente({ ...newCliente, contacto: e.target.value })}
              margin="dense"
              size="small"
              required
              error={touchedFields.contacto && !newCliente.contacto}
              helperText={touchedFields.contacto && !newCliente.contacto ? "Este campo es obligatorio" : ""}
            />
          </Grid>

          {/* Categoria */}
          <Grid item xs={12}>
            <TextField
              select
              label="Categoría"
              name="categoria"
              value={newCliente.categoria || ""}
              onChange={(e) => setNewCliente({ ...newCliente, categoria: e.target.value })}
              fullWidth
              margin="dense"
              size="small"
              required
              error={touchedFields.categoria && !newCliente.categoria}
              helperText={touchedFields.categoria && !newCliente.categoria ? "Este campo es obligatorio" : ""}
              sx={{ minWidth: '250px' }}
            >
              <MenuItem value=""></MenuItem>
              {["Empresa", "Particular"].map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Contacta por */}
          <Grid item xs={12}>
            <TextField
              label="Contacta por"
              name="contacta_por"
              fullWidth
              value={newCliente.contacta_por || ""}
              onChange={(e) => setNewCliente({ ...newCliente, contacta_por: e.target.value })}
              margin="dense"
              size="small"
            />
          </Grid>

        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpenClienteModal(false)}>Cancelar</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            // Marcar los campos obligatorios como tocados
            const requiredFields = ["nombre", "contacto", "categoria"];
            let newTouched = {};
            requiredFields.forEach(f => { newTouched[f] = true; });
            setTouchedFields(newTouched);

            // Validación antes de enviar
            for (const field of requiredFields) {
              if (!newCliente[field]) {
                setSnackbar({
                  open: true,
                  message: `El campo "${field.charAt(0).toUpperCase() + field.slice(1)}" es obligatorio`,
                  severity: "error"
                });
                return;
              }
            }

            handleSubmitCliente();
          }}
        >
          Crear Cliente
        </Button>
      </DialogActions>
    </Dialog>

    {/* Modal info cliente */}
    <Dialog
      open={openClienteInfo}
      onClose={() => setOpenClienteInfo(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>Información del Cliente</DialogTitle>
      <DialogContent>
        {clienteInfo ? (
          <Box sx={{ p: 1 }}>
            <p><strong>Nombre:</strong> {clienteInfo.nombre}</p>
            <p><strong>Localización:</strong> {clienteInfo.localizacion}</p>
            <p><strong>Contacto:</strong> {clienteInfo.contacto}</p>
            <p><strong>Categoría:</strong> {clienteInfo.categoria}</p>
            <p><strong>Contacta por:</strong> {clienteInfo.contacta_por}</p>
          </Box>
        ) : (
          <p>No se encontró información del cliente.</p>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenClienteInfo(false)}>Cerrar</Button>
      </DialogActions>
    </Dialog>


      {/* Modal Ver Stock */}
      <Dialog 
        open={openStockModal} 
        onClose={(event, reason) => {
          // Evita cierre al hacer click fuera del modal
          if (reason === "backdropClick") return;

          setOpenStockModal(false);
        }}
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
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
        onClose={(event, reason) => {
          // Evita cierre al hacer click fuera del modal
          if (reason === "backdropClick") return;

          setOpenAsignarStockModal(false);
        }}
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
                    { accessorKey: "formato", header: "Formato", enableColumnFilter: true },
                    { accessorKey: "ubicacion", header: "Ubicación", enableColumnFilter: true },
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
                  enableGlobalFilter={true}
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
                    { accessorKey: "formato", header: "Formato", enableColumnFilter: true },
                    { accessorKey: "ubicacion", header: "Ubicación", enableColumnFilter: true },
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
                  enableGlobalFilter={true}
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
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={() => setOpenNuevoStockModal(true)}
          >
            Nuevo Stock
          </Button>
          <Button onClick={() => setOpenAsignarStockModal(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveStockAsignado}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Nuevo Stock */}
      <Dialog
        open={openNuevoStockModal}
        onClose={(event, reason) => {
          // Evita cierre al hacer click fuera del modal
          if (reason === "backdropClick") return;

          setOpenNuevoStockModal(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nuevo Stock</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {[
              { key: "referencia", label: "Referencia", required: true },
              { key: "tipo", label: "Tipo", required: true },
              { key: "formato", label: "Formato"},
              { key: "ubicacion", label: "Ubicación"},
              { key: "cantidad", label: "Cantidad Disponible", required: true },
              { key: "cantidad_total", label: "Cantidad Comprada", required: true },
              { key: "precio", label: "Precio (€)", required: true },
            ].map((field) => (
              <Grid item xs={6} key={field.key}>
                <TextField
                  label={field.label}
                  name={field.key}
                  fullWidth
                  size="small"
                  required={field.required}
                  value={nuevoStock[field.key]}
                  onChange={(e) =>
                    setNuevoStock({ ...nuevoStock, [field.key]: e.target.value })
                  }
                  error={!!erroresNuevoStock[field.key]}
                  helperText={erroresNuevoStock[field.key] || ""}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevoStockModal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              // Validar campos obligatorios
              const requiredFields = ["referencia", "tipo", "cantidad", "cantidad_total", "precio"];
              const nuevosErrores = {};
              let hayErrores = false;

              requiredFields.forEach((field) => {
                if (!nuevoStock[field] || nuevoStock[field].toString().trim() === "") {
                  nuevosErrores[field] = "Este campo es obligatorio";
                  hayErrores = true;
                }
              });

              setErroresNuevoStock(nuevosErrores);

              if (hayErrores) return; 

              handleCreateStock();
              
            }}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

       {/* Modal info estado */}
      <Dialog
        open={openEstadoInfo}
        onClose={(event, reason) => {
          // Evita cierre al hacer click fuera del modal
          if (reason === "backdropClick") return;

          setOpenEstadoInfo(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Estados de Pedido</DialogTitle>
        <DialogContent dividers>
          {ESTADOS.map((estado, idx) => (
            <Box key={idx} mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                {estado.value}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {estado.label}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEstadoInfo(false)}>Cerrar</Button>
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
