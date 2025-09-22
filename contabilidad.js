import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let ingresos = [];
let egresos = [];
let ordenActual = "fecha"; // default

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await cargarDatos(user.uid);
      renderTablas();
    } else {
      alert("⚠ Inicie sesión");
    }
  });

  document.getElementById("filtroFecha").addEventListener("click", () => {
    ordenActual = "fecha";
    renderTablas();
  });

  document.getElementById("filtroAZ").addEventListener("click", () => {
    ordenActual = "az";
    renderTablas();
  });
});

// --- Cargar datos ---
async function cargarDatos(uid) {
  ingresos = await cargarColeccion("ingresos", uid);
  egresos = await cargarColeccion("egresos", uid);
}

async function cargarColeccion(tipo, uid) {
  const ref = collection(db, "contabilidad", uid, tipo);
  const snap = await getDocs(query(ref));
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

  let sorted = [...data];
  if (ordenActual === "fecha") {
    sorted.sort((a, b) => b.fecha - a.fecha); // más reciente primero
  } else if (ordenActual === "az") {
    sorted.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }

  tbody.innerHTML = sorted.map(mov => `
    <tr>
      <td>${mov.fecha.toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })}</td>
      <td>${mov.descripcion}</td>
      <td>₡${mov.monto}</td>
    </tr>
  `).join("");
}
