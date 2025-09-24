import { auth, db } from "./firebase.js";
import { 
  collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let movimientos = []; // todos los movimientos
let chart; // referencia de la gráfica

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarMovimientos(user.uid);
    }
  });

  document.getElementById("btnFiltrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btnVerTodo").addEventListener("click", () => {
    renderTabla(movimientos);
    renderGrafico(movimientos);
  });
});

// ---- Cargar todos los movimientos ----
function cargarMovimientos(uid) {
  const q = query(
    collection(db, "inventario_movimientos"),
    where("uid", "==", uid),
    orderBy("fecha", "desc")
  );

  onSnapshot(q, (snap) => {
    movimientos = [];
    snap.forEach(docu => {
      const d = docu.data();
      movimientos.push({
        fecha: d.fecha?.toDate() || new Date(),
        material: d.material,
        cantidad: d.cantidad,
        tipo: d.tipo
      });
    });
    renderTabla(movimientos);
    renderGrafico(movimientos); // mostrar gráfica con todo al inicio
  });
}

// ---- Render tabla ----
function renderTabla(data) {
  const tabla = document.querySelector("#tablaMovimientos tbody");
  tabla.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.style.backgroundColor = d.tipo === "entrada" ? "rgba(144, 238, 144, 0.3)" : "rgba(255, 99, 71, 0.3)";
    tr.innerHTML = `
      <td>${d.fecha.toLocaleString("es-CR")}</td>
      <td>${d.material}</td>
      <td>${d.cantidad}</td>
      <td>${d.tipo === "entrada" ? "⬆️ Entrada" : "⬇️ Salida"}</td>
    `;
    tabla.appendChild(tr);
  });
}

// ---- Render gráfica dinámica ----
function renderGrafico(data) {
  const entradas = {};
  const salidas = {};
  const inventario = {};

  data.forEach(d => {
    if (!entradas[d.material]) entradas[d.material] = 0;
    if (!salidas[d.material]) salidas[d.material] = 0;
    if (!inventario[d.material]) inventario[d.material] = 0;

    if (d.tipo === "entrada") {
      entradas[d.material] += d.cantidad;
      inventario[d.material] += d.cantidad;
    } else {
      salidas[d.material] += d.cantidad;
      inventario[d.material] -= d.cantidad;
    }
  });

  const materiales = Array.from(new Set([
    ...Object.keys(entradas),
    ...Object.keys(salidas),
    ...Object.keys(inventario)
  ]));

  const totalEntradas = materiales.map(m => entradas[m] || 0);
  const totalSalidas = materiales.map(m => salidas[m] || 0);
  const stockActual = materiales.map(m => inventario[m] || 0);

  const ctx = document.getElementById("graficoInventario").getContext("2d");

  if (chart) chart.destroy(); // limpiar gráfica anterior

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: materiales,
      datasets: [
        { label: "📥 Entradas (kg)", data: totalEntradas, backgroundColor: "rgba(54, 162, 235, 0.6)" },
        { label: "📤 Salidas (kg)", data: totalSalidas, backgroundColor: "rgba(255, 99, 132, 0.6)" },
        { label: "📦 Inventario Actual (kg)", data: stockActual, backgroundColor: "rgba(75, 192, 75, 0.6)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// ---- Filtros ----
function aplicarFiltros() {
  let filtrados = [...movimientos];

  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;
  const tipo = document.getElementById("filtroTipo").value;

  if (desde) {
    filtrados = filtrados.filter(d => d.fecha >= new Date(desde));
  }
  if (hasta) {
    filtrados = filtrados.filter(d => d.fecha <= new Date(hasta + "T23:59:59"));
  }
  if (tipo) {
    filtrados = filtrados.filter(d => d.tipo === tipo);
  }

  renderTabla(filtrados);
  renderGrafico(filtrados);
}
