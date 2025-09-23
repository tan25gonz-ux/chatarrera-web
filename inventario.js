import { auth, db } from "./firebase.js";
import { doc, getDoc, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería",
  "RCB", "RCA", "RA", "TARJETA mala", "TARJETA buena"
];

const tabla = document.querySelector("#tablaInventario tbody");
const tablaCompras = document.querySelector("#tablaCompras tbody");

let compras = []; // historial completo
let grafico = null;

// ---- Cargar Inventario ----
async function cargarInventario(uid) {
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  const datos = {};
  materiales.forEach(m => datos[m] = 0);

  if (snap.exists()) {
    const data = snap.data();
    const inventario = data.materiales || {};
    materiales.forEach(m => {
      if (inventario[m] !== undefined) {
        datos[m] = inventario[m];
      }
    });
  }

  tabla.innerHTML = "";
  materiales.forEach(mat => {
    tabla.innerHTML += `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
  });
}

// ---- Cargar Compras ----
async function cargarCompras(uid) {
  const q = query(collection(db, "pesajes"), where("usuario", "==", auth.currentUser.email), orderBy("fecha", "desc"));
  const snap = await getDocs(q);

  compras = [];
  tablaCompras.innerHTML = "";

  snap.forEach(doc => {
    const p = doc.data();
    const fecha = p.fecha?.toDate() || new Date();
    p.materiales.forEach(m => {
      compras.push({
        fecha,
        material: m.material,
        peso: m.peso
      });
    });
  });

  mostrarTodo();
}

// ---- Mostrar Todo ----
function mostrarTodo() {
  renderCompras(compras);
  actualizarGrafico(compras);
}

// ---- Filtrar por Rango ----
window.filtrarPorRango = function() {
  const inicio = document.getElementById("fechaInicio").value;
  const fin = document.getElementById("fechaFin").value;

  if (!inicio || !fin) {
    alert("Seleccione ambas fechas");
    return;
  }

  const inicioDate = new Date(inicio + "T00:00:00");
  const finDate = new Date(fin + "T23:59:59");

  const filtradas = compras.filter(c => c.fecha >= inicioDate && c.fecha <= finDate);
  renderCompras(filtradas);
  actualizarGrafico(filtradas);
};

window.mostrarTodo = mostrarTodo;

// ---- Renderizar Compras ----
function renderCompras(lista) {
  tablaCompras.innerHTML = "";
  if (!lista.length) {
    tablaCompras.innerHTML = "<tr><td colspan='3'>Sin registros</td></tr>";
    return;
  }
  lista.forEach(c => {
    tablaCompras.innerHTML += `
      <tr>
        <td>${c.fecha.toLocaleString("es-CR")}</td>
        <td>${c.material}</td>
        <td>${c.peso}</td>
      </tr>`;
  });
}

// ---- Gráfico ----
function actualizarGrafico(lista) {
  const resumen = {};
  lista.forEach(c => {
    resumen[c.material] = (resumen[c.material] || 0) + c.peso;
  });

  const ctx = document.getElementById("graficoCompras").getContext("2d");
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(resumen),
      datasets: [{
        label: "Kg comprados",
        data: Object.values(resumen),
        backgroundColor: "#007bff"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// ---- Auth ----
onAuthStateChanged(auth, (user) => {
  if (user) {
    cargarInventario(user.uid);
    cargarCompras(user.uid);
  } else {
    alert("⚠️ Debes iniciar sesión para ver inventario.");
    window.location.href = "index.html";
  }
});

document.getElementById("btnCerrar").addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  }).catch((e) => alert("❌ Error al cerrar sesión: " + e.message));
});
