// contabilidad.js (Firebase + filtros + gráficos)
// ——————————————————————————————————————————————————

import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let uid = null;
let movimientos = []; // [{descripcion, monto, tipo, fecha(Timestamp)}]
let grafico = null;

// —— Utils de formato ——

// Fecha local CR para mostrar (ej: "22/9/25, 10:30 a. m.")
const fmtCRDateTime = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  dateStyle: "short",
  timeStyle: "short"
});

// Fecha ISO para comparar con <input type="date"> (YYYY-MM-DD)
const fmtCRISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function tsToCRISO(ts) {
  if (!ts || !ts.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  return fmtCRISO.format(d); // "YYYY-MM-DD"
}

function tsToCRLocal(ts) {
  if (!ts || !ts.seconds) return "N/A";
  const d = new Date(ts.seconds * 1000);
  return fmtCRDateTime.format(d);
}

function formatCRC(n) {
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0
    }).format(n || 0);
  } catch {
    return `₡${(n || 0).toLocaleString("es-CR")}`;
  }
}

// —— Arranque: esperar login y cargar datos ——
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Debes iniciar sesión");
    window.location.href = "index.html";
    return;
  }
  uid = user.uid;
  await cargarMovimientos();  // esto llenará `movimientos`
  mostrarTodos();             // y pinta todo al inicio
});

// —— Guardar movimiento manual ——
export async function agregarMovimiento() {
  if (!uid) {
    alert("Debes iniciar sesión");
    return;
  }

  const descripcion = document.getElementById("descripcion")?.value?.trim();
  const monto = parseFloat(document.getElementById("monto")?.value);
  const tipo = document.getElementById("tipoMovimiento")?.value; // "ingreso" | "egreso"

  if (!descripcion || isNaN(monto)) {
    alert("Ingrese una descripción y un monto válido");
    return;
  }
  if (tipo !== "ingreso" && tipo !== "egreso") {
    alert("Seleccione tipo de movimiento");
    return;
  }

  try {
    await addDoc(collection(db, "contabilidad", uid, tipo === "ingreso" ? "ingresos" : "egresos"), {
      descripcion,
      monto: Number(monto),
      tipo,
      fecha: serverTimestamp()
    });

    // limpiar inputs
    const dEl = document.getElementById("descripcion");
    const mEl = document.getElementById("monto");
    if (dEl) dEl.value = "";
    if (mEl) mEl.value = "";

    // recargar
    await cargarMovimientos();
    mostrarTodos();
  } catch (e) {
    console.error("Error guardando movimiento:", e);
    alert("Error guardando movimiento");
  }
}

// —— Cargar movimientos desde Firestore ——
async function cargarMovimientos() {
  if (!uid) return;

  const lista = [];

  // ingresos
  const qIng = query(
    collection(db, "contabilidad", uid, "ingresos"),
    orderBy("fecha", "desc")
  );
  const snapIng = await getDocs(qIng);
  snapIng.forEach((docSnap) => {
    const data = docSnap.data();
    lista.push({
      id: docSnap.id,
      ...data,
      tipo: "ingreso"
    });
  });

  // egresos
  const qEgr = query(
    collection(db, "contabilidad", uid, "egresos"),
    orderBy("fecha", "desc")
  );
  const snapEgr = await getDocs(qEgr);
  snapEgr.forEach((docSnap) => {
    const data = docSnap.data();
    lista.push({
      id: docSnap.id,
      ...data,
      tipo: "egreso"
    });
  });

  // Mezclar y ordenar por fecha (recientes primero)
  lista.sort((a, b) => {
    const ta = a?.fecha?.seconds || 0;
    const tb = b?.fecha?.seconds || 0;
    return tb - ta;
  });

  movimientos = lista;
}

// —— Mostrar todo ——
export function mostrarTodos() {
  renderListas(movimientos);
  mostrarBalance(movimientos);
  actualizarGrafico(movimientos);
}

// —— Filtrar por tipo ——
export function filtrar(tipo) {
  const filtrados = movimientos.filter((m) => m.tipo === tipo);
  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}

// —— Filtrar por fecha (YYYY-MM-DD de <input type="date">) ——
export function filtrarPorFecha() {
  const fecha = document.getElementById("filtroFecha")?.value; // "YYYY-MM-DD"
  if (!fecha) {
    alert("Seleccione una fecha");
    return;
  }
  const filtrados = movimientos.filter((m) => tsToCRISO(m.fecha) === fecha);
  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}

// —— Render de listas ——
function renderListas(lista) {
  const ingresosUl = document.getElementById("listaIngresos");
  const egresosUl = document.getElementById("listaEgresos");
  if (!ingresosUl || !egresosUl) return;

  ingresosUl.innerHTML = "";
  egresosUl.innerHTML = "";

  if (!lista.length) {
    ingresosUl.innerHTML = "<li>Sin registros</li>";
    egresosUl.innerHTML = "<li>Sin registros</li>";
    return;
  }

  for (const m of lista) {
    const li = document.createElement("li");
    li.textContent = `${tsToCRLocal(m.fecha)} — ${m.descripcion}: ${formatCRC(m.monto)}`;
    if (m.tipo === "ingreso") ingresosUl.appendChild(li);
    else egresosUl.appendChild(li);
  }
}

// —— Balance ——
function mostrarBalance(lista) {
  const el = document.getElementById("balanceGeneral");
  if (!el) return;

  let ingresos = 0;
  let egresos = 0;

  for (const m of lista) {
    if (m.tipo === "ingreso") ingresos += Number(m.monto) || 0;
    else egresos += Number(m.monto) || 0;
  }

  const balance = ingresos - egresos;
  el.textContent = `Balance: ${formatCRC(balance)}`;

  if (balance > 0) el.className = "positivo";
  else if (balance < 0) el.className = "negativo";
  else el.className = "neutro";
}

// —— Gráfico ——
function actualizarGrafico(lista) {
  const canvas = document.getElementById("grafico");
  if (!canvas) return;

  let ingresos = 0;
  let egresos = 0;
  for (const m of lista) {
    if (m.tipo === "ingreso") ingresos += Number(m.monto) || 0;
    else egresos += Number(m.monto) || 0;
  }

  const ctx = canvas.getContext("2d");
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [
        {
          label: "₡",
          data: [ingresos, egresos],
          backgroundColor: ["#28a745", "#dc3545"]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatCRC(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => v.toLocaleString("es-CR")
          }
        }
      }
    }
  });
}
