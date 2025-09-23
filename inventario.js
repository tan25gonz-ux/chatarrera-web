// inventario.js
import { auth, db } from "./firebase.js";
import {
  doc, getDoc,
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let uid = null;
let historialCache = [];
let grafico = null;

const tablaInventario = document.querySelector("#tablaInventario tbody");
const tablaHistorial = document.querySelector("#tablaHistorial tbody");

// --- Formato fechas ---
function tsToCR(ts) {
  if (!ts || !ts.seconds) return "N/A";
  return new Date(ts.seconds * 1000).toLocaleString("es-CR");
}
function tsToISO(ts) {
  if (!ts || !ts.seconds) return "";
  return new Date(ts.seconds * 1000).toISOString().split("T")[0];
}

// --- Sesión ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("⚠️ Debes iniciar sesión.");
    window.location.href = "index.html";
    return;
  }
  uid = user.uid;
  await cargarInventario();
  await cargarHistorial();
});

document.getElementById("btnCerrar").addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });
});

// --- Inventario acumulado ---
async function cargarInventario() {
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  const datos = snap.exists() ? snap.data().materiales || {} : {};
  tablaInventario.innerHTML = "";
  Object.entries(datos).forEach(([mat, cant]) => {
    tablaInventario.innerHTML += `<tr><td>${mat}</td><td>${cant}</td></tr>`;
  });
}

// --- Historial ---
export async function cargarHistorial() {
  if (!uid) return;

  const q = query(
    collection(db, "inventario_historial"),
    where("usuario", "==", uid),
    orderBy("fecha", "desc")
  );
  const snap = await getDocs(q);

  historialCache = [];
  snap.forEach(d => {
    historialCache.push({ id: d.id, ...d.data() });
  });

  renderHistorial(historialCache);
  actualizarGrafico(historialCache);
}

// --- Filtrar historial por rango ---
export function filtrarHistorial() {
  const inicio = document.getElementById("fechaInicio").value;
  const fin = document.getElementById("fechaFin").value;

  if (!inicio && !fin) {
    alert("⚠️ Selecciona al menos una fecha");
    return;
  }

  const filtrados = historialCache.filter(m => {
    const iso = tsToISO(m.fecha);
    if (inicio && iso < inicio) return false;
    if (fin && iso > fin) return false;
    return true;
  });

  renderHistorial(filtrados);
  actualizarGrafico(filtrados);
}

// --- Render historial ---
function renderHistorial(lista) {
  tablaHistorial.innerHTML = "";
  if (!lista.length) {
    tablaHistorial.innerHTML = "<tr><td colspan='3'>Sin registros</td></tr>";
    return;
  }

  lista.forEach(m => {
    tablaHistorial.innerHTML += `
      <tr>
        <td>${tsToCR(m.fecha)}</td>
        <td>${m.material}</td>
        <td>${m.cantidad}</td>
      </tr>
    `;
  });
}

// --- Gráfico entradas por material ---
function actualizarGrafico(lista) {
  const datos = {};
  lista.forEach(m => {
    datos[m.material] = (datos[m.material] || 0) + Number(m.cantidad);
  });

  const ctx = document.getElementById("graficoInventario").getContext("2d");
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(datos),
      datasets: [{
        label: "Kg",
        data: Object.values(datos),
        backgroundColor: "#40e0d0"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
