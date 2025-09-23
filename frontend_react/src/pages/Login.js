// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //console.log("username",username)
      const res = await api.post("/login", { username, password });
      //console.log("RES",res)
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("username", username);
      onLogin(username);
      navigate("/pedidos");
    } catch (err) {
      console.error("ERR", err);
      if (err.response) {
        console.error("Server responded with:", err.response.data);
      }
      alert("Usuario o contraseña incorrectos");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Login</h2>
      <div>
        <label>Usuario:</label>
        <input value={username} onChange={e => setUsername(e.target.value)} />
      </div>
      <div>
        <label>Password:</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <button type="submit" style={{ marginTop: "10px" }}>Ingresar</button>
    </form>
  );
}

export default Login;
