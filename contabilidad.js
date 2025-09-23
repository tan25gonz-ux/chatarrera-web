import { auth, db } from "./firebase.js";
import { 
  collection, addDoc, serverTimestamp, getDocs, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let movimientos = [];
let grafico;

// 🚀 Al cargar la página, esperar login y traer datos
document.addEventListener("DOMContentLoaded", () => {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      cargarMovimientos();
    } else {
      alert("Debes iniciar sesión");
      window.location.href = "index.html";
    }
  });
});

// ------------------ GUARDAR MOVIMIENTO ------------------
export async function agregarMovimiento() {
  const descripcion = document.getElementById("descripcion").value;
  const monto = parseFloat(document.getElementById("monto").value);
  const tipo = document.getElementById("tipoMovimiento").value;
  const uid = auth?.currentUser?.uid;

  if (!descripcion || isNaN(monto) || !uid) {
    alert("Ingrese una descripción y un monto válido");
    return;
  }

  await addDoc(collection(db, "contabilidad", uid, tipo === "ingreso" ? "ingresos" : "egresos"), {
    descripcion,
    monto,
    tipo,
    fecha: serverTimestamp()
  });

  document.getElementById("descripcion").value = "";
  document.getElementById("monto").value = "";

  cargarMovimientos();
}

// ------------------ CARGAR MOVIMIENTOS ------------------
async function cargarMovimientos() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return;

  let lista = [];

  // Ingresos
  const ingresosSnap = await getDocs(query(collection(db, "contabilidad", uid, "ingresos"), orderBy("fecha", "desc")));
  ingresosSnap.forEach(doc => {
    lista.push({ id: doc.id, ...doc.data(), tipo: "ingreso" });
  });

  // Egresos
  const egresosSnap = await getDocs(query(collection(db, "contabilidad", uid, "egresos"), orderBy("fecha", "desc")));
  egresosSnap.forEach(doc => {
    lista.push({ id: doc.id, ...doc.data(), tipo: "egreso" });
  });

  movimientos = lista;

  mostrarTodos();
}

// ------------------ MOSTRAR TODOS ------------------
export function mostrarTodos() {
  renderListas(movimientos);
  mostrarBalance(movimientos);
  actualizarGrafico(movimientos);
}

// ------------------ FILTRAR INGRESOS / EGRESOS ------------------
export function filtrar(tipo) {
  const filtrados = movimientos.filter(m => m.tipo === tipo);
  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}

// ------------------ FILTRAR POR FECHA ------------------
export function filtrarPorFecha() {
  const fecha = document.getElementById("filtroFecha").value;
  if (!fecha) {
    alert("Seleccione una fecha");
    return;
  }

  const filtrados = movimientos.filter(m => {
    if (!m.fecha) return false;
    const fechaMovimiento = new Date(m.fecha.seconds * 1000).toISOString().split("T")[0];
    return fechaMovimiento === fecha;
  });

  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}

// ------------------ RENDER LISTAS ------------------
function renderListas(lista) {
  const ingresosUl = document.getElementById("listaIngresos");
  const egresosUl = document.getElementById("listaEgresos");

  ingresosUl.innerHTML = "";
  egresosUl.innerHTML = "";

  lista.forEach(m => {
    const li = document.createElement("li");
    const fechaLocal = m.fecha?.seconds ? new Date(m.fecha.seconds * 1000).toLocaleString("es-CR") : "N/A";
    li.textContent = `${fechaLocal} - ${m.descripcion}: ₡${m.monto}`;
    if (m.tipo === "ingreso") ingresosUl.appendChild(li);
    else egresosUl.appendChild(li);
  });
}

// ------------------ BALANCE ------------------
function mostrarBalance(lista) {
  let totalIngresos = 0;
  let totalEgresos = 0;

  lista.forEach(m => {
    if (m.tipo === "ingreso") totalIngresos += m.monto;
    else totalEgresos += m.monto;
  });

  const balance = totalIngresos - totalEgresos;
  const balanceDiv = document.getElementById("balanceGeneral");
  balanceDiv.textContent = `Balance: ₡${balance}`;

  if (balance > 0) {
    balanceDiv.className = "positivo";
  } else if (balance < 0) {
    balanceDiv.className = "negativo";
  } else {
    balanceDiv.className = "neutro";
  }
}

// ------------------ GRÁFICO ------------------
function actualizarGrafico(lista) {
  let totalIngresos = 0;
  let totalEgresos = 0;

  lista.forEach(m => {
    if (m.tipo === "ingreso") totalIngresos += m.monto;
    else totalEgresos += m.monto;
  });

  const ctx = document.getElementById("grafico").getContext("2d");
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{
        label: "₡",
        data: [totalIngresos, totalEgresos],
        backgroundColor: ["#28a745", "#dc3545"]
      }]
    }
  });
}
