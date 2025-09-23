import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let ingresos = [];
let egresos = [];
let ordenActual = "fecha"; // "fecha" | "az"
let chartComparativo = null;
let chartTotales = null;

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return alert("⚠ Inicie sesión");
    await cargarDatos(user.uid);
    renderTodo();
  });

  document.getElementById("filtroFecha")?.addEventListener("click", () => {
    ordenActual = "fecha";
    renderTodo();
  });
  document.getElementById("filtroAZ")?.addEventListener("click", () => {
    ordenActual = "az";
    renderTodo();
  });
});

async function cargarDatos(uid) {
  ingresos = await cargarColeccionOrdenada("ingresos", uid);
  egresos  = await cargarColeccionOrdenada("egresos", uid);
}

async function cargarColeccionOrdenada(tipo, uid) {
  const q = query(collection(db, "contabilidad", uid, tipo), orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderTodo() {
  // Copias para no mutar
  let ing = [...ingresos];
  let egr = [...egresos];

  if (ordenActual === "az") {
    ing.sort((a,b) => (a.descripcion || "").localeCompare(b.descripcion || ""));
    egr.sort((a,b) => (a.descripcion || "").localeCompare(b.descripcion || ""));
  }
  // si es "fecha", ya vienen en DESC desde Firestore

  renderTabla("tablaIngresos", ing);
  renderTabla("tablaEgresos", egr);
  renderGraficas(ing, egr);
}

// ----- Tablas -----
function renderTabla(idTabla, datos) {
  const tbody = document.querySelector(`#${idTabla} tbody`);
  if (!tbody) return;
  tbody.innerHTML = datos.map(d => `
    <tr>
      <td>${formatCR(d.fecha)}</td>
      <td>${d.descripcion || "-"}</td>
      <td>₡${d.monto ?? 0}</td>
    </tr>
  `).join("");
}

// ----- Gráficas -----
function renderGraficas(ingresosData, egresosData) {
  // Agrupar por fecha (día) en CR
  const ingPorDia = groupByDayCR(ingresosData);
  const egrPorDia = groupByDayCR(egresosData);

  const fechas = Array.from(new Set([...Object.keys(ingPorDia), ...Object.keys(egrPorDia)]))
    .sort((a,b) => new Date(a) - new Date(b)); // ascendente para lectura

  const datosIng = fechas.map(f => ingPorDia[f] || 0);
  const datosEgr = fechas.map(f => egrPorDia[f] || 0);

  // Comparativo barras
  const ctx1 = document.getElementById("graficoComparativo");
  if (chartComparativo) chartComparativo.destroy();
  chartComparativo = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: fechas,
      datasets: [
        { label: "Ingresos", data: datosIng, backgroundColor: "rgba(0,200,0,0.6)" },
        { label: "Egresos", data: datosEgr, backgroundColor: "rgba(200,0,0,0.6)" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Donut totales
  const totalIng = ingresosData.reduce((a,m)=>a+(m.monto||0),0);
  const totalEgr = egresosData.reduce((a,m)=>a+(m.monto||0),0);

  const ctx2 = document.getElementById("graficoTotales");
  if (chartTotales) chartTotales.destroy();
  chartTotales = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: ["Ingresos","Egresos"],
      datasets: [{ data: [totalIng, totalEgr], backgroundColor: ["rgba(0,200,0,0.7)","rgba(200,0,0,0.7)"] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ₡${(ctx.raw||0).toLocaleString("es-CR")}` } }
      }
    }
  });
}

// Agrupar por día usando zona CR
function groupByDayCR(arr) {
  const out = {};
  arr.forEach(m => {
    if (!m.fecha || typeof m.fecha.toDate !== "function") return;
    const d = m.fecha.toDate();
    // formatear yyyy-mm-dd en CR (sin horas)
    const dCR = new Date(d.toLocaleString("en-US", { timeZone: "America/Costa_Rica" }));
    const yyyy = dCR.getFullYear();
    const mm = String(dCR.getMonth()+1).padStart(2,"0");
    const dd = String(dCR.getDate()).padStart(2,"0");
    const key = `${yyyy}-${mm}-${dd}`;
    out[key] = (out[key] || 0) + (m.monto || 0);
  });
  return out;
}

// Mostrar siempre en hora de Costa Rica
function formatCR(ts) {
  if (!ts || typeof ts.toDate !== "function") return "N/A";
  return ts.toDate().toLocaleString("es-CR", {
    timeZone: "America/Costa_Rica",
    dateStyle: "short",
    timeStyle: "short"
  });
}
