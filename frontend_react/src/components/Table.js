import React, { useState, useMemo } from "react";
import { MaterialReactTable } from "material-react-table";
import { Box } from "@mui/material";

function Table({ rows, columns, onRowClick }) {
  const [columnOrder, setColumnOrder] = useState(columns.map(c => c.accessorKey));

  const memoColumns = useMemo(() => columns, [columns]);
  const memoRows = useMemo(() => rows, [rows]);

  return (
    <Box sx={{ width: "100%" }}>
      <MaterialReactTable
        columns={memoColumns}
        data={memoRows}
        enablePagination
        enableColumnActions
        enableColumnFilters
        //enableColumnDragging
        enableSorting
        initialState={{ pagination: { pageSize: 10 }, columnOrder }}
        onColumnOrderChange={setColumnOrder} // aquí se actualiza el orden
        muiTableBodyCellProps={({ cell }) => ({
          sx: { py: 0.5, px: 1 },
          onClick: () => onRowClick && onRowClick(cell.row.original),
        })}
        muiTableHeadCellProps={{
          sx: { py: 1, px: 1, fontWeight: "bold", cursor: "grab" },
        }}
        muiTableContainerProps={{ sx: { borderRadius: 2, boxShadow: 1, bgcolor: "white" } }}
      />
    </Box>
  );
}

export default Table;
