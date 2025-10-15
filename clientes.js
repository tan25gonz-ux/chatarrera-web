import { auth, db } from "./firebase.js";
import {
  collection, query, where, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) cargarResumenTrimestral(user.uid);
  });
});

// 🔹 Determinar el trimestre actual (enero–marzo, abril–junio, etc.)
function obtenerTrimestreActual() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth(); // 0 = enero

  let inicio, fin, nombre;

  if (mes < 3) {
    // Trimestre 1: enero - marzo
    inicio = new Date(año, 0, 1);
    fin = new Date(año, 2, 31, 23, 59, 59);
    nombre = "Enero - Marzo";
  } else if (mes < 6) {
    // Trimestre 2: abril - junio
    inicio = new Date(año, 3, 1);
    fin = new Date(año, 5, 30, 23, 59, 59);
    nombre = "Abril - Junio";
  } else if (mes < 9) {
    // Trimestre 3: julio - septiembre
    inicio = new Date(año, 6, 1);
    fin = new Date(año, 8, 30, 23, 59, 59);
    nombre = "Julio - Septiembre";
  } else {
    // Trimestre 4: octubre - diciembre
    inicio = new Date(año, 9, 1);
    fin = new Date(año, 11, 31, 23, 59, 59);
    nombre = "Octubre - Diciembre";
  }

  return {
    desde: Timestamp.fromDate(inicio),
    hasta: Timestamp.fromDate(fin),
    texto: `${nombre} ${año}`,
  };
}

// 🔹 Cargar resumen de clientes del trimestre actual
async function cargarResumenTrimestral(uid) {
  const contenedor = document.getElementById("resultadosClientes");
  contenedor.innerHTML = "⏳ Cargando resumen trimestral...";

  const trimestre = obtenerTrimestreActual();

  try {
    const q = query(
      collection(db, "inventario_movimientos"),
      where("uid", "==", uid),
      where("fecha", ">=", trimestre.desde),
      where("fecha", "<=", trimestre.hasta)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      contenedor.innerHTML = `❌ No hay movimientos registrados en ${trimestre.texto}`;
      return;
    }

    // Agrupar por cliente
    const clientes = {};
    snap.forEach(docu => {
      const d = docu.data();
      const nombre = d.nombre || "Sin nombre";
      const cedula = d.cedula || "N/A";
      const key = `${nombre}-${cedula}`;

      if (!clientes[key]) clientes[key] = {};
      if (!clientes[key][d.material]) clientes[key][d.material] = 0;
      clientes[key][d.material] += d.cantidad || 0;
    });

    // Mostrar resultados
    let html = `<h3>📅 Trimestre actual: ${trimestre.texto}</h3>`;
    for (const cliente in clientes) {
      const [nombre, cedula] = cliente.split("-");
      html += `<details><summary>👤 ${nombre} (Cédula: ${cedula})</summary>`;
      let total = 0;
      for (const [mat, cant] of Object.entries(clientes[cliente])) {
        html += `<p>🪨 ${mat}: ${cant.toLocaleString("es-CR")} kg</p>`;
        total += cant;
      }
      html += `<p><strong>📦 Total: ${total.toLocaleString("es-CR")} kg</strong></p></details>`;
    }

    contenedor.innerHTML = html;

  } catch (e) {
    console.error("Error al cargar resumen trimestral:", e);
    contenedor.innerHTML = "❌ Error al obtener datos de Firebase.";
  }
}
