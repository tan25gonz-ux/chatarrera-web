import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let ingresos = [];
let egresos = [];
let ordenActual = "fecha"; // "fecha" | "az"

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return alert("⚠ Inicie sesión");
    await cargarDatos(user.uid);
    renderTodo();
  });

  document.getElementById("filtroFecha")?.addEventListener("click", () => {
    ordenActual = "fecha"; renderTodo();
  });
  document.getElementById("filtroAZ")?.addEventListener("click", () => {
    ordenActual = "az"; renderTodo();
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
  let ing = [...ingresos];
  let egr = [...egresos];

  if (ordenActual === "az") {
    ing.sort((a,b) => (a.descripcion || "").localeCompare(b.descripcion || ""));
    egr.sort((a,b) => (a.descripcion || "").localeCompare(b.descripcion || ""));
  }

  renderTabla("tablaIngresos", ing);
  renderTabla("tablaEgresos", egr);
}

function renderTabla(idTabla, datos) {
  const tbody = document.querySelector(`#${idTabla} tbody`);
  if (!tbody) return;
  tbody.innerHTML = datos.map(d => `
    <tr>
      <td>${formatLocal(d.fecha)}</td>
      <td>${d.descripcion || "-"}</td>
      <td>₡${d.monto ?? 0}</td>
    </tr>
  `).join("");
}

// ---- Usar hora local del dispositivo ----
function formatLocal(ts) {
  if (!ts || typeof ts.toDate !== "function") return "N/A";
  return ts.toDate().toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short"
  });
}
