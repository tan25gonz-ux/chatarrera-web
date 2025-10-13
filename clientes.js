import { auth, db } from "./firebase.js";
import {
  collection, query, where, orderBy, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnFiltrarClientes").addEventListener("click", filtrarClientes);
  document.getElementById("btnExportarClientes").addEventListener("click", exportarCSV);

  onAuthStateChanged(auth, (user) => {
    if (user) window.currentUID = user.uid;
  });
});

async function filtrarClientes() {
  const desde = document.getElementById("filtroDesdeClientes").value;
  const hasta = document.getElementById("filtroHastaClientes").value;
  const resultadosDiv = document.getElementById("resultadosClientes");

  resultadosDiv.innerHTML = "Buscando...";

  if (!desde || !hasta) {
    resultadosDiv.innerHTML = "❌ Seleccione un rango de fechas válido.";
    return;
  }

  try {
    const fDesde = Timestamp.fromDate(new Date(desde + "T00:00:00"));
    const fHasta = Timestamp.fromDate(new Date(hasta + "T23:59:59"));

    const q = query(
      collection(db, "inventario_movimientos"),
      where("uid", "==", window.currentUID),
      where("fecha", ">=", fDesde),
      where("fecha", "<=", fHasta),
      orderBy("fecha")
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      resultadosDiv.innerHTML = "❌ No hay movimientos en ese rango.";
      return;
    }

    // --- Agrupar por cliente ---
    const clientes = {};
    snap.forEach(docu => {
      const d = docu.data();
      const cedula = d.cedula || "N/A";
      const nombre = d.nombre || "Sin nombre";
      const material = d.material || "Desconocido";
      const cantidad = d.cantidad || 0;

      if (!clientes[cedula]) {
        clientes[cedula] = {
          nombre,
          cedula,
          materiales: {},
          total: 0,
          movimientos: 0
        };
      }

      clientes[cedula].materiales[material] = (clientes[cedula].materiales[material] || 0) + cantidad;
      clientes[cedula].total += cantidad;
      clientes[cedula].movimientos++;
    });

    // --- Renderizar resultados ---
    let html = `<p><strong>📅 Rango:</strong> ${desde} a ${hasta}</p><hr>`;
    Object.values(clientes).forEach(cli => {
      html += `
        <div style="margin-bottom:15px;padding:10px;border:1px solid #ccc;border-radius:8px;">
          <p><strong>👤 ${cli.nombre}</strong> (Cédula: ${cli.cedula})</p>
          <ul>
            ${Object.entries(cli.materiales).map(([mat, cant]) => `<li>🪨 ${mat}: ${cant} kg</li>`).join("")}
          </ul>
          <p>📦 <strong>Total:</strong> ${cli.total} kg</p>
          <p>🧾 <strong>Movimientos:</strong> ${cli.movimientos}</p>
        </div>
      `;
    });

    resultadosDiv.innerHTML = html;

  } catch (e) {
    console.error(e);
    resultadosDiv.innerHTML = "❌ Error al cargar datos o falta un índice en Firestore.";
  }
}

// ---- 📤 Exportar CSV ----
function exportarCSV() {
  const div = document.getElementById("resultadosClientes");
  if (!div || div.innerText.trim() === "" || div.innerText.includes("Buscando")) {
    alert("Primero realice una búsqueda.");
    return;
  }

  let csv = "Nombre,Cédula,Material,Cantidad (kg),Total (kg),Movimientos\n";

  // Extraer datos del DOM
  const bloques = div.querySelectorAll("div");
  bloques.forEach(b => {
    const nombre = b.querySelector("strong")?.innerText.replace("👤 ", "") || "";
    const texto = b.innerText.split("\n");
    const cedula = (texto.find(t => t.includes("Cédula")) || "").replace("Cédula:", "").trim();
    const materiales = texto.filter(t => t.includes("🪨"));
    materiales.forEach(m => {
      const [mat, cant] = m.replace("🪨", "").split(":");
      csv += `${nombre},${cedula},${mat.trim()},${cant.trim()},,,\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes_materiales.csv";
  a.click();
  URL.revokeObjectURL(url);
}
