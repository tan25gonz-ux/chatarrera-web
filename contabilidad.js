import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let ingresos = [];
let egresos = [];
let ordenActual = "fecha"; // default

let graficoIngresos, graficoEgresos;

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await cargarDatos(user.uid);
      renderTablas();
      renderGraficos();
    } else {
      alert("⚠ Inicie sesión");
    }
  });

  document.getElementById("filtroFecha").addEventListener("click", () => {
    ordenActual = "fecha";
    renderTablas();
    renderGraficos(); // 🔁 refrescar gráficos
  });

  document.getElementById("filtroAZ").addEventListener("click", () => {
    ordenActual = "az";
    renderTablas();
    renderGraficos(); // 🔁 refrescar gráficos
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

// --- Renderizar tablas ---
function renderTablas() {
  renderTabla("tablaIngresos", ingresos);
  renderTabla("tablaEgresos", egresos);
}

function renderTabla(id, data) {
  const tbody = document.querySelector(`#${id} tbody`);
  if (!tbody) return;

  let sorted = ordenarDatos([...data]);

  tbody.innerHTML = sorted.map(mov => `
    <tr>
      <td>${mov.fecha.toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })}</td>
      <td>${mov.descripcion}</td>
      <td>₡${mov.monto}</td>
    </tr>
  `).join("");
}

// --- Renderizar gráficos ---
function renderGraficos() {
  let ingresosOrdenados = ordenarDatos([...ingresos]);
  let egresosOrdenados = ordenarDatos([...egresos]);

  renderGrafico("graficoIngresos", ingresosOrdenados, "Ingresos", "green");
  renderGrafico("graficoEgresos", egresosOrdenados, "Egresos", "red");
}

function renderGrafico(canvasId, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = data.map(m => m.descripcion);
  const valores = data.map(m => m.monto);

  // destruir gráfico previo
  if (canvasId === "graficoIngresos" && graficoIngresos) graficoIngresos.destroy();
  if (canvasId === "graficoEgresos" && graficoEgresos) graficoEgresos.destroy();

  const nuevoGrafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data: valores,
        backgroundColor: color
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  if (canvasId === "graficoIngresos") graficoIngresos = nuevoGrafico;
  if (canvasId === "graficoEgresos") graficoEgresos = nuevoGrafico;
}

// --- Función de ordenamiento común ---
function ordenarDatos(data) {
  if (ordenActual === "fecha") {
    data.sort((a, b) => b.fecha - a.fecha); // más reciente primero
  } else if (ordenActual === "az") {
    data.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }
  return data;
}
