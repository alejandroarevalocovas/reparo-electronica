import React, { useState, useMemo } from "react";
import { MaterialReactTable } from "material-react-table";
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

function Table({ rows, columns, onRowClick }) {
  const [columnOrder, setColumnOrder] = useState(columns.map(c => c.accessorKey));
  const [openModal, setOpenModal] = useState(false);
  const [modalContent, setModalContent] = useState("");

  const memoColumns = useMemo(() => columns, [columns]);
  const memoRows = useMemo(() => rows, [rows]);

  // Custom render para celdas de comentarios
  const enhancedColumns = memoColumns.map(col => {
    if (col.accessorKey === "comentarios" || 
      col.accessorKey === "estado" || 
      col.accessorKey === "part_number" || 
      col.accessorKey === "enlace_compra" || 
      col.accessorKey === "equipo" ||
      col.accessorKey === "nombre" ||
      col.accessorKey === "contacto" ||
      col.accessorKey === "referencia" ||
      col.accessorKey === "tipo" ||
      col.accessorKey === "formato" ||
      col.accessorKey === "visto_en"
      ) {
      return {
        ...col,
        Cell: ({ row }) => {
          const text = row.original[col.accessorKey] || "";
          const truncated = text.length > 30 ? text.slice(0, 30) + "…" : text;

          return (
            <Box
              sx={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setModalContent(text);
                setOpenModal(true);
              }}
            >
              {truncated}
            </Box>
          );
        },
      };
    }
    return col;
  });

  return (
    <Box sx={{ width: "100%" }}>
      <MaterialReactTable
        columns={enhancedColumns}
        data={memoRows}
        enablePagination
        enableColumnActions
        enableColumnFilters
        enableSorting
        initialState={{ pagination: { pageSize: 10 }, columnOrder }}
        onColumnOrderChange={setColumnOrder}
        
        muiTableBodyRowProps={{
          sx: { height: 50 }, // altura fija
        }}

        muiTableBodyCellProps={({ cell }) => ({
          sx: {
            py: 0.5,
            px: 1,
            height: 50,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: onRowClick ? "pointer" : "default",
          },
          onClick: () => onRowClick && onRowClick(cell.row.original),
        })}

        muiTableHeadCellProps={{
          sx: { py: 1, px: 1, fontWeight: "bold", cursor: "grab" },
        }}

        muiTableContainerProps={{ sx: { borderRadius: 2, boxShadow: 1, bgcolor: "white" } }}
        layoutMode="grid"
      />

      {/* Modal para mostrar comentarios completos */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contenido completo</DialogTitle>
        <DialogContent>
          <Typography>{modalContent}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Table;
