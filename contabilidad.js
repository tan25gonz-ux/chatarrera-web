import { auth, db } from "./firebase.js";
import {
  collection, getDocs, addDoc, serverTimestamp,
  doc, setDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let movimientos = [];
let uidActual = null;

// ================= Cargar movimientos =================
async function cargarMovimientos() {
  if (!uidActual) return;
  movimientos = [];

  const ingresosSnap = await getDocs(query(collection(db, "contabilidad", uidActual, "ingresos"), orderBy("fecha", "desc")));
  ingresosSnap.forEach(docu => movimientos.push({ id: docu.id, ...docu.data(), tipo: "ingreso" }));

  const egresosSnap = await getDocs(query(collection(db, "contabilidad", uidActual, "egresos"), orderBy("fecha", "desc")));
  egresosSnap.forEach(docu => movimientos.push({ id: docu.id, ...docu.data(), tipo: "egreso" }));

  mostrarMovimientos(movimientos);
  calcularBalance(movimientos);
  actualizarGraficos();
}

// ================= Mostrar en pantalla =================
function mostrarMovimientos(lista) {
  const div = document.getElementById("listaMovimientos");
  if (!div) return;
  if (!lista.length) { div.innerHTML = "<p>❌ No hay movimientos</p>"; return; }

  div.innerHTML = lista.map(m => {
    const fecha = m.fecha?.toDate().toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }) || "Sin fecha";
    return `<p><strong>[${m.tipo.toUpperCase()}]</strong> ${m.descripcion} - ₡${m.monto} <em>${fecha}</em></p>`;
  }).join("");
}

// ================= Balance =================
function calcularBalance(lista) {
  const ingresos = lista.filter(m => m.tipo === "ingreso").reduce((a,b)=>a+b.monto,0);
  const egresos = lista.filter(m => m.tipo === "egreso").reduce((a,b)=>a+b.monto,0);
  const balance = ingresos - egresos;

  document.getElementById("totalIngresos").textContent = `Total Ingresos: ₡${ingresos}`;
  document.getElementById("totalEgresos").textContent = `Total Egresos: ₡${egresos}`;
  document.getElementById("balanceFinal").textContent = `Balance: ₡${balance}`;
}

// ================= Gráficos =================
let graficoBarras, graficoLineas;
function actualizarGraficos() {
  const ctxBarras = document.getElementById("graficoBarras");
  const ctxLineas = document.getElementById("graficoLineas");

  const ingresos = movimientos.filter(m => m.tipo === "ingreso").reduce((a,b)=>a+b.monto,0);
  const egresos = movimientos.filter(m => m.tipo === "egreso").reduce((a,b)=>a+b.monto,0);

  if (graficoBarras) graficoBarras.destroy();
  graficoBarras = new Chart(ctxBarras, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{
        label: "Montos",
        data: [ingresos, egresos],
        backgroundColor: ["#28a745","#dc3545"]
      }]
    }
  });

  if (graficoLineas) graficoLineas.destroy();
  graficoLineas = new Chart(ctxLineas, {
    type: "line",
    data: {
      labels: movimientos.map(m=>m.fecha?.toDate().toLocaleDateString("es-CR")),
      datasets: [{
        label: "Movimientos",
        data: movimientos.map(m=>m.monto * (m.tipo === "ingreso" ? 1 : -1)),
        fill: false,
        borderColor: "#007bff"
      }]
    }
  });
}

// ================= Eventos filtros existentes =================
document.getElementById("filtroHoy")?.addEventListener("click", () => {
  const hoy = new Date();
  const filtrados = movimientos.filter(m=>{
    const f = m.fecha?.toDate();
    return f && f.toDateString() === hoy.toDateString();
  });
  mostrarMovimientos(filtrados);
  calcularBalance(filtrados);
});

document.getElementById("filtroSemana")?.addEventListener("click", () => {
  const hoy = new Date();
  const inicio = new Date(hoy); inicio.setDate(hoy.getDate()-7);
  const filtrados = movimientos.filter(m=>{
    const f = m.fecha?.toDate();
    return f && f >= inicio && f <= hoy;
  });
  mostrarMovimientos(filtrados);
  calcularBalance(filtrados);
});

document.getElementById("filtroMes")?.addEventListener("click", () => {
  const hoy = new Date();
  const mes = hoy.getMonth(), anio = hoy.getFullYear();
  const filtrados = movimientos.filter(m=>{
    const f = m.fecha?.toDate();
    return f && f.getMonth() === mes && f.getFullYear() === anio;
  });
  mostrarMovimientos(filtrados);
  calcularBalance(filtrados);
});

document.getElementById("filtroTodo")?.addEventListener("click", () => {
  mostrarMovimientos(movimientos);
  calcularBalance(movimientos);
});

// ================= NUEVO: Ingresos/Egresos manual =================
document.getElementById("btnAgregarMovimiento")?.addEventListener("click", async () => {
  const desc = document.getElementById("descMovimiento").value.trim();
  const monto = parseFloat(document.getElementById("montoMovimiento").value);
  const tipo = document.getElementById("tipoMovimiento").value;

  if (!desc || isNaN(monto) || monto <= 0) {
    alert("❌ Complete todos los campos correctamente");
    return;
  }

  await addDoc(collection(db, "contabilidad", uidActual, tipo === "ingreso" ? "ingresos" : "egresos"), {
    descripcion: desc,
    monto: monto,
    fecha: serverTimestamp()
  });

  document.getElementById("descMovimiento").value = "";
  document.getElementById("montoMovimiento").value = "";

  cargarMovimientos();
});

// ================= NUEVO: Filtro por fecha puntual =================
document.getElementById("btnAplicarFiltro")?.addEventListener("click", () => {
  const fechaSel = document.getElementById("filtroFecha").value;
  if (!fechaSel) return alert("Seleccione una fecha");

  const fecha = new Date(fechaSel);
  const dia = fecha.getDate();
  const mes = fecha.getMonth();
  const anio = fecha.getFullYear();

  const filtrados = movimientos.filter(m => {
    if (!m.fecha) return false;
    const f = m.fecha.toDate();
    return f.getDate() === dia && f.getMonth() === mes && f.getFullYear() === anio;
  });

  mostrarMovimientos(filtrados);
  calcularBalance(filtrados);
});

document.getElementById("btnVerTodo")?.addEventListener("click", () => {
  mostrarMovimientos(movimientos);
  calcularBalance(movimientos);
});

// ================= Login =================
auth.onAuthStateChanged(user=>{
  if (user) {
    uidActual = user.uid;
    cargarMovimientos();
  } else {
    window.location.href = "index.html";
  }
});
