import { auth, db } from "./firebase.js";
import {
  collection, query, where, orderBy, onSnapshot, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let movimientos = []; // Guardar todos los movimientos cargados

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarMovimientos(user.uid);   // 🔥 Historial de movimientos
      cargarInventario(user.uid);    // 🔥 Inventario en tiempo real
    }
  });

  document.getElementById("btnFiltrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btnExportar").addEventListener("click", exportarCSV);
  document.getElementById("btnBuscarCedula").addEventListener("click", filtrarPorCedula);
  document.getElementById("btnImprimirCedula").addEventListener("click", imprimirResultadosCedula);
});

// ---- Cargar todos los movimientos ----
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
        tipo: d.tipo,
        detalle: d.detalle || (d.tipo === "entrada" ? "entrada directa" : "salida directa")
      });
    });
    renderTabla(movimientos);
    renderGrafico(movimientos);
  });
}

// ---- Render tabla de movimientos ----
function renderTabla(data) {
  const tabla = document.querySelector("#tablaMovimientosAvanzado tbody");
  tabla.innerHTML = "";

  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.style.backgroundColor = d.tipo === "entrada" ? "rgba(144, 238, 144, 0.3)" : "rgba(255, 99, 71, 0.3)";

    let icono = "📦";
    if (d.detalle?.toLowerCase().includes("desarme")) icono = "🛠";
    else if (d.detalle?.toLowerCase().includes("venta")) icono = "💸";
    else if (d.detalle?.toLowerCase().includes("entrada")) icono = "📥";
    else if (d.detalle?.toLowerCase().includes("salida")) icono = "📤";

    tr.innerHTML = `
      <td>${d.fecha.toLocaleString("es-CR")}</td>
      <td>${d.material}</td>
      <td>${d.cantidad}</td>
      <td>${d.tipo === "entrada" ? "⬆️ Entrada" : "⬇️ Salida"}</td>
      <td>${icono} ${d.detalle}</td>
    `;
    tabla.appendChild(tr);
  });
}

// ---- Render gráfico avanzado ----
function renderGrafico(data) {
  const entradas = {};
  const salidas = {};

  data.forEach(d => {
    if (!entradas[d.material]) entradas[d.material] = 0;
    if (!salidas[d.material]) salidas[d.material] = 0;

    if (d.tipo === "entrada") {
      entradas[d.material] += d.cantidad;
    } else {
      salidas[d.material] += d.cantidad;
    }
  });

  const materiales = Array.from(new Set([...Object.keys(entradas), ...Object.keys(salidas)]));

  const totalEntradas = materiales.map(m => entradas[m] || 0);
  const totalSalidas = materiales.map(m => salidas[m] || 0);

  const ctx = document.getElementById("graficoInventarioAvanzado").getContext("2d");
  if (window.chartInventario) window.chartInventario.destroy();

  window.chartInventario = new Chart(ctx, {
    type: "bar",
    data: {
      labels: materiales,
      datasets: [
        { label: "📥 Entradas (kg)", data: totalEntradas, backgroundColor: "rgba(54, 162, 235, 0.6)" },
        { label: "📤 Salidas (kg)", data: totalSalidas, backgroundColor: "rgba(255, 99, 132, 0.6)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// ---- Cargar inventario real ----
function cargarInventario(uid) {
  const ref = doc(db, "inventarios", uid);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const inventario = snap.data().materiales || {};
    renderInventarioAcumulado(inventario);
  });
}

// ---- Render tabla inventario acumulado ----
function renderInventarioAcumulado(inventario) {
  const tabla = document.querySelector("#tablaInventarioAcumulado tbody");
  tabla.innerHTML = "";

  const ordenados = Object.entries(inventario).sort((a, b) => b[1] - a[1]);
  if (ordenados.length === 0) return;

  ordenados.forEach(([material, cantidad]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${material}</td><td>${cantidad}</td>`;
    tabla.appendChild(tr);
  });
}

// ---- Filtros ----
function aplicarFiltros() {
  let filtrados = [...movimientos];
  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;
  const tipo = document.getElementById("filtroTipo").value;
  const detalle = document.getElementById("filtroDetalle").value;

  if (desde) filtrados = filtrados.filter(d => d.fecha >= new Date(desde));
  if (hasta) filtrados = filtrados.filter(d => d.fecha <= new Date(hasta + "T23:59:59"));
  if (tipo) filtrados = filtrados.filter(d => d.tipo === tipo);
  if (detalle) filtrados = filtrados.filter(d => d.detalle?.toLowerCase().includes(detalle.toLowerCase()));

  renderTabla(filtrados);
  renderGrafico(filtrados);
}

// ---- Exportar CSV ----
function exportarCSV() {
  let csv = "Fecha,Material,Cantidad (kg),Tipo,Detalle\n";
  movimientos.forEach(d => {
    csv += `${d.fecha.toLocaleString("es-CR")},${d.material},${d.cantidad},${d.tipo},${d.detalle}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventario_movimientos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---- 🔍 Buscar por Cédula (desde pesajes) ----
async function filtrarPorCedula() {
  const cedula = document.getElementById("buscarCedula").value.trim();
  const contenedor = document.getElementById("resultadosCedula");
  if (!cedula) return contenedor.innerHTML = "<p>⚠️ Ingrese una cédula válida.</p>";

  try {
    const q = query(collection(db, "pesajes"), where("cedula", "==", cedula), orderBy("fecha", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      contenedor.innerHTML = `<p>❌ No hay registros con la cédula <strong>${cedula}</strong>.</p>`;
      return;
    }

    let html = "";
    snap.forEach(doc => {
      const p = doc.data();
      const fecha = p.fecha?.toDate().toLocaleString("es-CR") || "Sin fecha";
      const materiales = (p.materiales || []).map(m => `${m.material} (${m.peso}kg)`).join(", ");
      const total = p.totalGeneral?.toLocaleString("es-CR", { style: "currency", currency: "CRC" }) || "₡0";

      html += `
        <div class="tarjeta">
          <p>🧾 <strong>${p.nombre || "Desconocido"}</strong> (Cédula ${p.cedula || "N/A"})</p>
          <p>📅 <strong>Fecha:</strong> ${fecha}</p>
          <p>🪨 <strong>Materiales:</strong> ${materiales}</p>
          <p>💰 <strong>Total:</strong> ${total}</p>
        </div>
        <hr>
      `;
    });

    contenedor.innerHTML = html;
  } catch (e) {
    console.error("Error al filtrar por cédula:", e);
    contenedor.innerHTML = `<p>❌ Error al buscar: ${e.message}</p>`;
  }
}

// ---- 🖨 Imprimir resultados de cédula ----
function imprimirResultadosCedula() {
  const contenido = document.getElementById("resultadosCedula").innerHTML;
  if (!contenido.trim()) return alert("No hay resultados para imprimir.");
  const w = window.open("", "PRINT");
  w.document.write("<html><head><title>Historial por Cédula</title>");
  w.document.write("<style>body{font-family:Courier;font-size:14px}.tarjeta{margin-bottom:10px}</style>");
  w.document.write("</head><body>");
  w.document.write(contenido);
  w.document.write("</body></html>");
  w.document.close();
  w.print();
}
