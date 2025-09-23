// src/components/Table.js
import React from "react";
import { MaterialReactTable } from "material-react-table";
import { Box } from "@mui/material";

function Table({ rows, columns, onRowClick }) {
  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 150px)" }}>
      <MaterialReactTable
        columns={columns}
        data={rows}
        enablePagination
        enableColumnActions
        enableColumnFilters
        enableSorting
        initialState={{ pagination: { pageSize: 10 } }}
        density="compact" // filas compactas
        muiTableBodyRowProps={({ row }) => ({
          onClick: () => { if (onRowClick) onRowClick(row.original); },
          sx: {
            cursor: "pointer",
            "&:hover": { backgroundColor: "#f0f0f0" }, // hover moderno
          },
        })}
        muiTableBodyCellProps={{ sx: { py: 0.5, px: 1 } }} // menos padding vertical/horizontal
        muiTableHeadCellProps={{ sx: { py: 1, px: 1, fontWeight: "bold" } }} // header compacto
        muiTableContainerProps={{ sx: { borderRadius: 2, boxShadow: 1, bgcolor: "white" } }} // contenedor tipo tarjeta
      />
    </Box>
  );
}

export default Table;
