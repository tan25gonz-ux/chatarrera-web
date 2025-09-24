import { auth, db } from "./firebase.js";
import { 
  collection, query, where, orderBy, onSnapshot, doc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let movimientos = []; // Guardar todos los movimientos cargados

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarMovimientos(user.uid);   // 🔥 Historial de movimientos
      cargarInventario(user.uid);    // 🔥 Inventario en tiempo real
    }
  });

  document.getElementById("btnFiltrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btnExportar").addEventListener("click", exportarCSV);
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
    renderGrafico(movimientos);
  });
}

// ---- Render tabla de movimientos ----
function renderTabla(data) {
  const tabla = document.querySelector("#tablaMovimientosAvanzado tbody");
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

// ---- Render gráfico avanzado ----
function renderGrafico(data) {
  const entradas = {};
  const salidas = {};

  data.forEach(d => {
    if (!entradas[d.material]) entradas[d.material] = 0;
    if (!salidas[d.material]) salidas[d.material] = 0;

    if (d.tipo === "entrada") {
      entradas[d.material] += d.cantidad;
    } else {
      salidas[d.material] += d.cantidad;
    }
  });

  const materiales = Array.from(new Set([
    ...Object.keys(entradas),
    ...Object.keys(salidas)
  ]));

  const totalEntradas = materiales.map(m => entradas[m] || 0);
  const totalSalidas = materiales.map(m => salidas[m] || 0);

  const ctx = document.getElementById("graficoInventarioAvanzado").getContext("2d");
  if (window.chartInventario) window.chartInventario.destroy();

  window.chartInventario = new Chart(ctx, {
    type: "bar",
    data: {
      labels: materiales,
      datasets: [
        { label: "📥 Entradas (kg)", data: totalEntradas, backgroundColor: "rgba(54, 162, 235, 0.6)" },
        { label: "📤 Salidas (kg)", data: totalSalidas, backgroundColor: "rgba(255, 99, 132, 0.6)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// ---- Cargar inventario real en tiempo real ----
function cargarInventario(uid) {
  const ref = doc(db, "inventarios", uid);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const inventario = snap.data().materiales || {};
    renderInventarioAcumulado(inventario);
  });
}

// ---- Render tabla inventario acumulado (ordenada + colores) ----
function renderInventarioAcumulado(inventario) {
  const tabla = document.querySelector("#tablaInventarioAcumulado tbody");
  tabla.innerHTML = "";

  // Ordenar de mayor a menor
  const ordenados = Object.entries(inventario).sort((a, b) => b[1] - a[1]);

  if (ordenados.length === 0) return;

  const max = ordenados[0][1];
  const min = ordenados[ordenados.length - 1][1];

  ordenados.forEach(([material, cantidad]) => {
    let ratio = (cantidad - min) / (max - min || 1);

    // Verde -> Rojo
    const r = Math.round(255 - (200 * ratio));
    const g = Math.round(50 + (200 * ratio));
    const b = 50;

    const tr = document.createElement("tr");
    tr.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
    tr.innerHTML = `
      <td>${material}</td>
      <td>${cantidad}</td>
    `;
    tabla.appendChild(tr);
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

// ---- Exportar a CSV ----
function exportarCSV() {
  let csv = "Fecha,Material,Cantidad (kg),Tipo\n";
  movimientos.forEach(d => {
    csv += `${d.fecha.toLocaleString("es-CR")},${d.material},${d.cantidad},${d.tipo}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventario_movimientos.csv";
  a.click();
  URL.revokeObjectURL(url);
}
