// src/components/TableMui.js
import React from "react";
import { MaterialReactTable } from "material-react-table";


function Table({ rows, columns }) {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 150px)" }}>
      <MaterialReactTable
        columns={columns}
        data={rows}
        enablePagination
        enableColumnActions
        enableColumnFilters
        enableSorting
        initialState={{ pagination: { pageSize: 10 } }}
        muiTableContainerProps={{
          sx: { maxHeight: "100%" }, // Ajusta el scroll dentro del contenedor
        }}
      />
    </div>
  );
}

export default Table;
