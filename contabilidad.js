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
let movimientos = [];
let grafico = null;


const fmtCRDateTime = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  dateStyle: "short",
  timeStyle: "short"
});

const fmtCRISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function tsToCRISO(ts) {
  if (!ts || !ts.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  return fmtCRISO.format(d);
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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Debes iniciar sesión");
    window.location.href = "index.html";
    return;
  }
  uid = user.uid;
  await cargarMovimientos();
  mostrarTodos();
});

export async function agregarMovimiento() {
  if (!uid) return;

  const descripcion = document.getElementById("descripcion")?.value?.trim();
  const monto = parseFloat(document.getElementById("monto")?.value);
  const tipo = document.getElementById("tipoMovimiento")?.value;

  if (!descripcion || isNaN(monto)) {
    alert("Ingrese una descripción y un monto válido");
    return;
  }

  try {
    await addDoc(collection(db, "contabilidad", uid, tipo === "ingreso" ? "ingresos" : "egresos"), {
      descripcion,
      monto: Number(monto),
      tipo,
      fecha: serverTimestamp()
    });

    document.getElementById("descripcion").value = "";
    document.getElementById("monto").value = "";

    await cargarMovimientos();
    mostrarTodos();
  } catch (e) {
    console.error("Error guardando movimiento:", e);
  }
}


async function cargarMovimientos() {
  if (!uid) return;

  const lista = [];

  const qIng = query(collection(db, "contabilidad", uid, "ingresos"), orderBy("fecha", "desc"));
  const snapIng = await getDocs(qIng);
  snapIng.forEach((docSnap) => {
    lista.push({ id: docSnap.id, ...docSnap.data(), tipo: "ingreso" });
  });

  const qEgr = query(collection(db, "contabilidad", uid, "egresos"), orderBy("fecha", "desc"));
  const snapEgr = await getDocs(qEgr);
  snapEgr.forEach((docSnap) => {
    lista.push({ id: docSnap.id, ...docSnap.data(), tipo: "egreso" });
  });

  lista.sort((a, b) => (b?.fecha?.seconds || 0) - (a?.fecha?.seconds || 0));
  movimientos = lista;
}


export function mostrarTodos() {
  renderListas(movimientos);
  mostrarBalance(movimientos);
  actualizarGrafico(movimientos);
}


export function filtrar(tipo) {
  const filtrados = movimientos.filter((m) => m.tipo === tipo);
  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}


export function filtrarPorFecha() {
  const fecha = document.getElementById("filtroFecha")?.value;
  if (!fecha) return alert("Seleccione una fecha");
  const filtrados = movimientos.filter((m) => tsToCRISO(m.fecha) === fecha);
  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}


export function filtrarPorRango() {
  const fechaInicio = document.getElementById("filtroFechaInicio")?.value;
  const fechaFin = document.getElementById("filtroFechaFin")?.value;

  if (!fechaInicio || !fechaFin) {
    alert("Seleccione ambas fechas");
    return;
  }

  const desde = new Date(fechaInicio + "T00:00:00");
  const hasta = new Date(fechaFin + "T23:59:59");

  const filtrados = movimientos.filter((m) => {
    if (!m.fecha?.seconds) return false;
    const fechaMov = new Date(m.fecha.seconds * 1000);
    return fechaMov >= desde && fechaMov <= hasta;
  });

  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}


function renderListas(lista) {
  const ingresosUl = document.getElementById("listaIngresos");
  const egresosUl = document.getElementById("listaEgresos");

  ingresosUl.innerHTML = "";
  egresosUl.innerHTML = "";

  if (!lista.length) {
    ingresosUl.innerHTML = "<li>Sin registros</li>";
    egresosUl.innerHTML = "<li>Sin registros</li>";
    return;
  }

  lista.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = `${tsToCRLocal(m.fecha)} — ${m.descripcion}: ${formatCRC(m.monto)}`;
    if (m.tipo === "ingreso") ingresosUl.appendChild(li);
    else egresosUl.appendChild(li);
  });
}


function mostrarBalance(lista) {
  const el = document.getElementById("balanceGeneral");
  let ingresos = 0, egresos = 0;

  lista.forEach((m) => {
    if (m.tipo === "ingreso") ingresos += Number(m.monto);
    else egresos += Number(m.monto);
  });

  const balance = ingresos - egresos;
  el.textContent = `Balance: ${formatCRC(balance)}`;
  el.className = balance > 0 ? "positivo" : balance < 0 ? "negativo" : "neutro";
}


function actualizarGrafico(lista) {
  const ctx = document.getElementById("grafico").getContext("2d");
  if (grafico) grafico.destroy();

  let ingresos = 0, egresos = 0;
  lista.forEach((m) => {
    if (m.tipo === "ingreso") ingresos += Number(m.monto);
    else egresos += Number(m.monto);
  });

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{
        label: "₡",
        data: [ingresos, egresos],
        backgroundColor: ["#28a745", "#dc3545"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
