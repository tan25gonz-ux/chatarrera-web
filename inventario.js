import { auth, db } from "./firebase.js";
import { 
  collection, query, where, orderBy, onSnapshot, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let movimientos = []; // para filtros

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarMovimientos(user.uid);
      cargarInventarioTotal(user.uid);
    }
  });

  document.getElementById("btnFiltrar").addEventListener("click", aplicarFiltros);
});

// ---- Historial de movimientos ----
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

// ---- Cargar totales para gráfica ----
async function cargarInventarioTotal(uid) {
  const ref = doc(db, "inventarios", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const datos = snap.data().materiales || {};
  const labels = Object.keys(datos);
  const valores = Object.values(datos);

  const ctx = document.getElementById("graficoInventario").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Cantidad en Inventario (kg)",
        data: valores,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
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
}
