import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let ingresos = [];
let egresos = [];
let ordenActual = "fecha"; // default

let graficoComparativo, graficoTotales;

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await cargarDatos(user.uid);
      renderTodo();
    } else {
      alert("⚠ Inicie sesión");
    }
  });

  document.getElementById("filtroFecha").addEventListener("click", () => {
    ordenActual = "fecha";
    renderTodo();
  });

  document.getElementById("filtroAZ").addEventListener("click", () => {
    ordenActual = "az";
    renderTodo();
  });
});

// --- Cargar datos ---
async function cargarDatos(uid) {
  ingresos = await cargarColeccion("ingresos", uid);
  egresos = await cargarColeccion("egresos", uid);
}

async function cargarColeccion(tipo, uid) {
  const ref = collection(db, "contabilidad", uid, tipo);
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({
    ...d.data(),
    fecha: d.data().fecha.toDate(),
    id: d.id
  }));
}

// --- Renderizar TODO (tablas + gráficas) ---
function renderTodo() {
  let ingresosOrdenados = ordenarDatos([...ingresos]);
  let egresosOrdenados = ordenarDatos([...egresos]);

  renderTabla("tablaIngresos", ingresosOrdenados);
  renderTabla("tablaEgresos", egresosOrdenados);

  renderGraficoComparativo(ingresosOrdenados, egresosOrdenados);
  renderGraficoTotales(ingresosOrdenados, egresosOrdenados);
}

// --- Renderizar tablas ---
function renderTabla(id, data) {
  const tbody = document.querySelector(`#${id} tbody`);
  if (!tbody) return;

  tbody.innerHTML = data.map(mov => `
    <tr>
      <td>${mov.fecha.toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })}</td>
      <td>${mov.descripcion}</td>
      <td>₡${mov.monto}</td>
    </tr>
  `).join("");
}

// --- Gráfico de barras comparativas ---
function renderGraficoComparativo(ingresosData, egresosData) {
  const ctx = document.getElementById("graficoComparativo");
  if (!ctx) return;

  const ingresosPorFecha = {};
  ingresosData.forEach(m => {
    const fecha = m.fecha.toLocaleDateString("es-CR");
    ingresosPorFecha[fecha] = (ingresosPorFecha[fecha] || 0) + m.monto;
  });

  const egresosPorFecha = {};
  egresosData.forEach(m => {
    const fecha = m.fecha.toLocaleDateString("es-CR");
    egresosPorFecha[fecha] = (egresosPorFecha[fecha] || 0) + m.monto;
  });

  const fechas = Array.from(new Set([
    ...Object.keys(ingresosPorFecha),
    ...Object.keys(egresosPorFecha)
  ])).sort((a, b) => new Date(a) - new Date(b));

  const ingresosValores = fechas.map(f => ingresosPorFecha[f] || 0);
  const egresosValores = fechas.map(f => egresosPorFecha[f] || 0);

  if (graficoComparativo) graficoComparativo.destroy();

  graficoComparativo = new Chart(ctx, {
    type: "bar",
    data: {
      labels: fechas,
      datasets: [
        { label: "Ingresos", data: ingresosValores, backgroundColor: "rgba(0,200,0,0.6)" },
        { label: "Egresos", data: egresosValores, backgroundColor: "rgba(200,0,0,0.6)" }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// --- Gráfico de dona (totales) ---
function renderGraficoTotales(ingresosData, egresosData) {
  const ctx = document.getElementById("graficoTotales");
  if (!ctx) return;

  const totalIngresos = ingresosData.reduce((acc, m) => acc + m.monto, 0);
  const totalEgresos = egresosData.reduce((acc, m) => acc + m.monto, 0);

  if (graficoTotales) graficoTotales.destroy();

  graficoTotales = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{
        data: [totalIngresos, totalEgresos],
        backgroundColor: ["rgba(0,200,0,0.7)", "rgba(200,0,0,0.7)"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw.toLocaleString("es-CR");
              return `${context.label}: ₡${value}`;
            }
          }
        }
      }
    }
  });
}

// --- Función de ordenamiento ---
function ordenarDatos(data) {
  if (ordenActual === "fecha") {
    data.sort((a, b) => b.fecha - a.fecha);
  } else if (ordenActual === "az") {
    data.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }
  return data;
}
