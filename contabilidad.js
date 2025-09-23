import { auth, db } from "./firebase.js";
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let uidActual = null;
let movimientos = []; // todos los movimientos

// ⏳ Esperar usuario logueado
onAuthStateChanged(auth, (user) => {
  if (user) {
    uidActual = user.uid;
    cargarMovimientos();
  }
});

// 📌 Agregar movimiento manual
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

// 📌 Cargar movimientos
async function cargarMovimientos() {
  if (!uidActual) return;
  movimientos = [];

  const qIngresos = query(collection(db, "contabilidad", uidActual, "ingresos"), orderBy("fecha", "desc"));
  const qEgresos = query(collection(db, "contabilidad", uidActual, "egresos"), orderBy("fecha", "desc"));

  const [snapIngresos, snapEgresos] = await Promise.all([getDocs(qIngresos), getDocs(qEgresos)]);

  snapIngresos.forEach(doc => movimientos.push({ ...doc.data(), tipo: "Ingreso" }));
  snapEgresos.forEach(doc => movimientos.push({ ...doc.data(), tipo: "Egreso" }));

  mostrarMovimientos(movimientos);
}

// 📌 Mostrar en tabla
function mostrarMovimientos(lista) {
  const tbody = document.querySelector("#tablaMovimientos tbody");
  tbody.innerHTML = "";

  let totalIngresos = 0;
  let totalEgresos = 0;

  lista.forEach(mov => {
    const fecha = mov.fecha?.toDate().toLocaleDateString("es-CR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }) || "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${mov.descripcion}</td>
      <td>${mov.tipo}</td>
      <td>₡${mov.monto}</td>
    `;
    tbody.appendChild(tr);

    if (mov.tipo === "Ingreso") totalIngresos += mov.monto;
    else totalEgresos += mov.monto;
  });

  document.getElementById("totalIngresos").textContent = `Total Ingresos: ₡${totalIngresos}`;
  document.getElementById("totalEgresos").textContent = `Total Egresos: ₡${totalEgresos}`;

  const balance = totalIngresos - totalEgresos;
  const balanceEl = document.getElementById("balanceFinal");
  balanceEl.textContent = `Balance: ₡${balance}`;
  balanceEl.style.color = balance >= 0 ? "green" : "red";
}

// 📌 Filtro por fecha
document.getElementById("btnAplicarFiltro")?.addEventListener("click", () => {
  const fechaSel = document.getElementById("filtroFecha").value;
  if (!fechaSel) return alert("Seleccione una fecha");

  const filtrados = movimientos.filter(m => {
    if (!m.fecha) return false;
    const f = m.fecha.toDate();
    const fechaStr = f.toISOString().split("T")[0]; // yyyy-mm-dd
    return fechaStr === fechaSel;
  });

  mostrarMovimientos(filtrados);
});

// 📌 Ver todo
document.getElementById("btnVerTodo")?.addEventListener("click", () => {
  mostrarMovimientos(movimientos);
});
