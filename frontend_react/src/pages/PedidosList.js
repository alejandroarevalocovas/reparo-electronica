// src/pages/PedidosList.js
import React, { useEffect, useState } from "react";
import Table from "../components/Table";
import { api } from "../api/api";

function PedidosList() {
  const [pedidos, setPedidos] = useState([]);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    const fetchPedidos = async () => {
      const token = localStorage.getItem("token");
      const res = await api.get("/pedidos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;

      if (data.length > 0) {
        const cols = Object.keys(data[0]).map((key) => ({
          accessorKey: key, // clave de los datos
          id: key,          // id único obligatorio si el header no es un string simple
          header: key.replace(/_/g, " ").toUpperCase(), // título de la columna
        }));
        setColumns(cols);
      }
      setPedidos(data);
    };
    fetchPedidos();
  }, []);

  return (
    <div style={{ background: "white", borderRadius: 8, padding: 16, height: "100%" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: 16 }}>Pedidos</h2>
      <Table rows={pedidos} columns={columns} />
    </div>
  );
}

export default PedidosList;
