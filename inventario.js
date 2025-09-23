// inventario.js
import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  getDocs,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let uid = null;
let historial = []; // todos los registros de inventario_historial
let grafico = null;

// === Formateadores ===
function formatFecha(ts) {
  if (!ts?.seconds) return "N/A";
  return new Date(ts.seconds * 1000).toLocaleString("es-CR");
}

function formatPeso(p) {
  return `${p} kg`;
}

// === Cargar historial ===
async function cargarHistorial() {
  if (!uid) return;
  const q = query(
    collection(db, "inventario_historial"),
    where("uid", "==", uid),
    orderBy("fecha", "desc")
  );
  const snap = await getDocs(q);

  historial = [];
  snap.forEach((docSnap) => {
    historial.push({ id: docSnap.id, ...docSnap.data() });
  });

  mostrarTabla(historial);
  actualizarGrafico(historial);
}

// === Mostrar tabla ===
function mostrarTabla(lista) {
  const tbody = document.querySelector("#tablaHistorial tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = "<tr><td colspan='3'>Sin registros</td></tr>";
    return;
  }

  lista.forEach((m) => {
    tbody.innerHTML += `
      <tr>
        <td>${formatFecha(m.fecha)}</td>
        <td>${m.material}</td>
        <td>${formatPeso(m.peso)}</td>
      </tr>
    `;
  });
}

// === Filtrar por rango de fechas ===
function filtrarPorRango() {
  const desde = document.getElementById("fechaDesde").value;
  const hasta = document.getElementById("fechaHasta").value;

  if (!desde || !hasta) {
    alert("Seleccione ambas fechas");
    return;
  }

  const desdeDate = new Date(desde);
  const hastaDate = new Date(hasta);
  hastaDate.setHours(23, 59, 59, 999);

  const filtrados = historial.filter((m) => {
    const d = new Date(m.fecha.seconds * 1000);
    return d >= desdeDate && d <= hastaDate;
  });

  mostrarTabla(filtrados);
  actualizarGrafico(filtrados);
}

// === Mostrar todo ===
function mostrarTodo() {
  mostrarTabla(historial);
  actualizarGrafico(historial);
}

// === Gráfico ===
function actualizarGrafico(lista) {
  const ctx = document.getElementById("grafico");
  if (!ctx) return;

  const agrupado = {};
  lista.forEach((m) => {
    if (!agrupado[m.material]) agrupado[m.material] = 0;
    agrupado[m.material] += Number(m.peso) || 0;
  });

  const labels = Object.keys(agrupado);
  const datos = Object.values(agrupado);

  if (grafico) grafico.destroy();
  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Peso (kg)",
          data: datos,
          backgroundColor: "#007bff"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// === Eventos ===
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Debes iniciar sesión");
    window.location.href = "index.html";
    return;
  }
  uid = user.uid;
  cargarHistorial();
});

document.getElementById("btnFiltrar")?.addEventListener("click", filtrarPorRango);
document.getElementById("btnTodo")?.addEventListener("click", mostrarTodo);

document.getElementById("btnCerrar")?.addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });
});
