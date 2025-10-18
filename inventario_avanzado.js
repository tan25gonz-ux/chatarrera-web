import { auth, db } from "./firebase.js";
import {
  collection, query, where, orderBy, onSnapshot, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let movimientos = [];

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarMovimientos(user.uid);

    }
  });

  document.getElementById("btnFiltrar")?.addEventListener("click", aplicarFiltros);
  document.getElementById("btnExportar")?.addEventListener("click", exportarCSV);
  document.getElementById("btnBuscarCedula")?.addEventListener("click", buscarPorCedula);
  document.getElementById("btnImprimirCedula")?.addEventListener("click", imprimirResultados);
});


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
      const fecha =
        d?.fechaLocal ? new Date(d.fechaLocal) :
        (typeof d?.fecha?.toDate === "function" ? d.fecha.toDate() : new Date());

      movimientos.push({
        fecha,
        material: d.material,
        cantidad: Number(d.cantidad) || 0,
        tipo: d.tipo,
        detalle: d.detalle || (d.tipo === "entrada" ? "entrada directa" : "salida directa"),
        cedula: d.cedula || "",
        nombre: d.nombre || ""
      });
    });


    renderTabla(movimientos);
    renderGrafico(movimientos);
    actualizarInventarioFiltrado(movimientos);
  }, (err) => {
    console.error("onSnapshot inventario_movimientos:", err);
  });
}


function renderTabla(data) {
  const tbody = document.querySelector("#tablaMovimientosAvanzado tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.style.backgroundColor = d.tipo === "entrada"
      ? "rgba(144,238,144,0.3)"
      : "rgba(255,99,71,0.3)";

    let icono = "📦";
    const det = (d.detalle || "").toLowerCase();
    if (det.includes("desarme")) icono = "🛠";
    else if (det.includes("venta")) icono = "💸";
    else if (det.includes("entrada")) icono = "📥";
    else if (det.includes("salida")) icono = "📤";

    tr.innerHTML = `
      <td>${d.fecha.toLocaleString("es-CR")}</td>
      <td>${d.material}</td>
      <td>${(d.cantidad || 0).toLocaleString("es-CR")}</td>
      <td>${d.tipo === "entrada" ? "⬆️ Entrada" : "⬇️ Salida"}</td>
      <td>${icono} ${d.detalle || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}


function renderGrafico(data) {
  const entradas = {};
  const salidas = {};

  data.forEach(d => {
    if (!entradas[d.material]) entradas[d.material] = 0;
    if (!salidas[d.material]) salidas[d.material] = 0;
    if (d.tipo === "entrada") entradas[d.material] += d.cantidad || 0;
    else salidas[d.material] += d.cantidad || 0;
  });

  const materiales = Array.from(new Set([...Object.keys(entradas), ...Object.keys(salidas)]));
  const totalEntradas = materiales.map(m => entradas[m] || 0);
  const totalSalidas = materiales.map(m => salidas[m] || 0);

  const canvas = document.getElementById("graficoInventarioAvanzado");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (window.chartInventario) window.chartInventario.destroy();

  window.chartInventario = new Chart(ctx, {
    type: "bar",
    data: {
      labels: materiales,
      datasets: [
        { label: "📥 Entradas (kg)", data: totalEntradas, backgroundColor: "rgba(54,162,235,0.6)" },
        { label: "📤 Salidas (kg)", data: totalSalidas, backgroundColor: "rgba(255,99,132,0.6)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function actualizarInventarioFiltrado(data) {
  const resumen = {};
  data.forEach(d => {
    const mat = d.material || "Desconocido";
    if (!resumen[mat]) resumen[mat] = 0;
    resumen[mat] += Number(d.cantidad) || 0;
  });

  const tbody = document.querySelector("#tablaInventarioAcumulado tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const ordenados = Object.entries(resumen).sort((a, b) => b[1] - a[1]);

  if (!ordenados.length) {
    tbody.innerHTML = "<tr><td colspan='2'>Sin datos en este rango</td></tr>";
    ponerTotalFiltrado(0);
    return;
  }

  const max = ordenados[0][1];
  const min = ordenados[ordenados.length - 1][1];
  let totalGeneral = 0;

  ordenados.forEach(([material, cantidad]) => {
    totalGeneral += cantidad;
    const ratio = (cantidad - min) / (max - min || 1);
    const r = Math.round(255 - (200 * ratio));
    const g = Math.round(50 + (200 * ratio));
    const tr = document.createElement("tr");
    tr.style.backgroundColor = `rgba(${r}, ${g}, 50, 0.4)`;
    tr.innerHTML = `<td>${material}</td><td>${cantidad.toLocaleString("es-CR")}</td>`;
    tbody.appendChild(tr);
  });

  ponerTotalFiltrado(totalGeneral);
}

function ponerTotalFiltrado(total) {
  const tabla = document.getElementById("tablaInventarioAcumulado");
  if (!tabla) return;

  let totalDiv = document.getElementById("totalFiltrado");
  if (!totalDiv) {
    totalDiv = document.createElement("div");
    totalDiv.id = "totalFiltrado";
    totalDiv.style.textAlign = "right";
    totalDiv.style.marginTop = "10px";
    tabla.parentElement.appendChild(totalDiv);
  }
  totalDiv.innerHTML = `<strong>📦 Total general filtrado:</strong> ${total.toLocaleString("es-CR")} kg`;
}


function aplicarFiltros() {
  let filtrados = [...movimientos];
  const desde = document.getElementById("filtroDesde")?.value;
  const hasta = document.getElementById("filtroHasta")?.value;
  const tipo = document.getElementById("filtroTipo")?.value;
  const detalle = document.getElementById("filtroDetalle")?.value;

  if (desde) filtrados = filtrados.filter(d => d.fecha >= new Date(desde + "T00:00:00"));
  if (hasta) filtrados = filtrados.filter(d => d.fecha <= new Date(hasta + "T23:59:59"));
  if (tipo) filtrados = filtrados.filter(d => d.tipo === tipo);
  if (detalle) filtrados = filtrados.filter(d => (d.detalle || "").toLowerCase().includes(detalle.toLowerCase()));

  renderTabla(filtrados);
  renderGrafico(filtrados);
  actualizarInventarioFiltrado(filtrados);
}


function exportarCSV() {
  let csv = "Fecha,Material,Cantidad (kg),Tipo,Detalle\n";
  movimientos.forEach(d => {
    csv += `${d.fecha.toLocaleString("es-CR")},${d.material},${d.cantidad},${d.tipo},${(d.detalle||"")}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventario_movimientos.csv";
  a.click();
  URL.revokeObjectURL(url);
}


async function buscarPorCedula() {
  const cedula = document.getElementById("buscarCedula")?.value?.trim();
  const desde = document.getElementById("filtroDesdeCedula")?.value;
  const hasta = document.getElementById("filtroHastaCedula")?.value;
  const resultadosDiv = document.getElementById("resultadosCedula");

  resultadosDiv.innerHTML = "Buscando...";

  if (!cedula) return (resultadosDiv.innerHTML = "❌ Ingrese una cédula.");
  if (!desde || !hasta) return (resultadosDiv.innerHTML = "❌ Seleccione el rango de fechas.");

  try {
    const fDesde = Timestamp.fromDate(new Date(desde + "T00:00:00"));
    const fHasta = Timestamp.fromDate(new Date(hasta + "T23:59:59"));

    const q = query(
      collection(db, "inventario_movimientos"),
      where("cedula", "==", cedula),
      where("fecha", ">=", fDesde),
      where("fecha", "<=", fHasta),
      orderBy("fecha")
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      resultadosDiv.innerHTML = "❌ No se encontraron movimientos en ese rango.";
      return;
    }

    let totalKilos = 0;
    const resumenMateriales = {};

    snap.forEach(docu => {
      const d = docu.data();
      const material = d.material || "Desconocido";
      const cantidad = Number(d.cantidad) || 0;
      resumenMateriales[material] = (resumenMateriales[material] || 0) + cantidad;
      totalKilos += cantidad;
    });

    let html = `<p><strong>📅 Rango:</strong> ${desde} a ${hasta}</p><hr>`;
    html += `<h3>📦 Resumen por Material</h3>`;
    Object.entries(resumenMateriales).forEach(([mat, cant]) => {
      html += `<p>🪨 ${mat}: ${cant.toLocaleString("es-CR")} kg</p>`;
    });
    html += `<p><strong>📦 Total:</strong> ${totalKilos.toLocaleString("es-CR")} kg</p>`;

    resultadosDiv.innerHTML = html;
  } catch (e) {
    console.error("Error en buscarPorCedula:", e);
    resultadosDiv.innerHTML = "❌ Error al buscar datos (posible índice requerido en Firestore).";
  }
}


function imprimirResultados() {
  const contenido = document.getElementById("resultadosCedula")?.innerHTML;
  if (!contenido || contenido.includes("Buscando")) return alert("Primero realice una búsqueda.");
  const ventana = window.open("", "PRINT");
  ventana.document.write("<html><head><title>Resultados por Cédula</title>");
  ventana.document.write("<style>body{font-family:Arial;font-size:14px;padding:20px}</style>");
  ventana.document.write("</head><body>");
  ventana.document.write("<h2>📋 Resultados de movimientos por Cédula</h2>");
  ventana.document.write(contenido);
  ventana.document.write("</body></html>");
  ventana.document.close();
  ventana.print();
  ventana.close();
}
