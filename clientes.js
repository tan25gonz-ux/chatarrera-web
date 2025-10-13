import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnBuscar = document.getElementById("btnBuscar");
  if (btnBuscar) btnBuscar.addEventListener("click", buscarClientes);
});

async function buscarClientes() {
  const desde = document.getElementById("filtroDesde")?.value;
  const hasta = document.getElementById("filtroHasta")?.value;
  const resultadosDiv = document.getElementById("resultadosClientes");

  resultadosDiv.innerHTML = "Buscando...";

  if (!desde || !hasta) {
    resultadosDiv.innerHTML = "❌ Seleccione el rango de fechas.";
    return;
  }

  try {
    const fDesde = Timestamp.fromDate(new Date(desde + "T00:00:00"));
    const fHasta = Timestamp.fromDate(new Date(hasta + "T23:59:59"));

    const q = query(
      collection(db, "inventario_movimientos"),
      where("fecha", ">=", fDesde),
      where("fecha", "<=", fHasta)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      resultadosDiv.innerHTML = "❌ No se encontraron registros en ese rango.";
      return;
    }

    // --- Agrupar por cliente ---
    const clientes = {};
    snap.forEach(docu => {
      const d = docu.data();
      const nombre = d.nombre || "Sin nombre";
      const cedula = d.cedula || "N/A";
      const clave = `${nombre}_${cedula}`;

      if (!clientes[clave]) {
        clientes[clave] = { nombre, cedula, materiales: {}, total: 0, movimientos: 0 };
      }

      const material = d.material || "Desconocido";
      const cantidad = d.cantidad || 0;

      clientes[clave].materiales[material] = (clientes[clave].materiales[material] || 0) + cantidad;
      clientes[clave].total += cantidad;
      clientes[clave].movimientos += 1;
    });

    // --- Renderizar con bloques desplegables (cerrados) ---
    let html = `<p><strong>📅 Rango:</strong> ${desde} a ${hasta}</p><hr>`;

    for (const key in clientes) {
      const c = clientes[key];
      const id = key.replace(/\s+/g, "_");

      html += `
      <div class="cliente-card">
        <button class="cliente-header" onclick="toggleCliente('${id}', this)">
          <span>👤 ${c.nombre} (${c.cedula})</span>
          <span class="arrow">🔽</span>
        </button>
        <div id="${id}" class="cliente-detalle">
          ${Object.entries(c.materiales).map(([mat, cant]) => `
            <p>🪨 ${mat}: ${cant.toLocaleString("es-CR")} kg</p>
          `).join("")}
          <p>📦 <strong>Total:</strong> ${c.total.toLocaleString("es-CR")} kg</p>
          <p>🧾 Movimientos: ${c.movimientos}</p>
        </div>
      </div>
      `;
    }

    resultadosDiv.innerHTML = html;
  } catch (e) {
    console.error(e);
    resultadosDiv.innerHTML = "❌ Error al buscar los datos.";
  }
}

// ✅ Función global para abrir/cerrar con flecha animada
window.toggleCliente = (id, btn) => {
  const div = document.getElementById(id);
  if (!div) return;

  const arrow = btn.querySelector(".arrow");

  if (div.style.display === "block") {
    div.style.display = "none";
    arrow.textContent = "🔽";
  } else {
    div.style.display = "block";
    arrow.textContent = "🔼";
  }
};
