import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnIngreso").addEventListener("click", () => registrarMovimiento("ingresos"));
  document.getElementById("btnEgreso").addEventListener("click", () => registrarMovimiento("egresos"));
  document.getElementById("btnCerrar").addEventListener("click", cerrarSesion);
});

let currentUID = null;

// --- Registrar Ingreso/Egreso ---
async function registrarMovimiento(tipo) {
  const desc = document.getElementById(tipo === "ingresos" ? "descIngreso" : "descEgreso").value;
  const monto = parseFloat(document.getElementById(tipo === "ingresos" ? "montoIngreso" : "montoEgreso").value) || 0;

  if (!desc || monto <= 0) {
    alert("Ingrese una descripción y un monto válido");
    return;
  }

  try {
    await addDoc(collection(db, "contabilidad", currentUID, tipo), {
      descripcion: desc,
      monto,
      fecha: Timestamp.now()
    });

    alert("✅ Registro guardado correctamente");
    cargarMovimientos(); // recargar tabla
  } catch (e) {
    alert("❌ Error al guardar: " + e.message);
  }
}

// --- Cargar ingresos y egresos ---
async function cargarMovimientos() {
  const tabla = document.querySelector("#tablaContabilidad tbody");
  const totalesDiv = document.getElementById("totales");

  tabla.innerHTML = "";
  let totalIngresos = 0;
  let totalEgresos = 0;

  // Consultar ingresos
  const qIngresos = query(collection(db, "contabilidad", currentUID, "ingresos"), orderBy("fecha", "desc"));
  const snapIngresos = await getDocs(qIngresos);
  snapIngresos.forEach(doc => {
    const d = doc.data();
    const fecha = d.fecha?.toDate().toLocaleDateString("es-CR") || "Sin fecha";
    tabla.innerHTML += `<tr>
      <td>${fecha}</td>
      <td>${d.descripcion}</td>
      <td>₡${d.monto}</td>
      <td>-</td>
    </tr>`;
    totalIngresos += d.monto;
  });

  // Consultar egresos
  const qEgresos = query(collection(db, "contabilidad", currentUID, "egresos"), orderBy("fecha", "desc"));
  const snapEgresos = await getDocs(qEgresos);
  snapEgresos.forEach(doc => {
    const d = doc.data();
    const fecha = d.fecha?.toDate().toLocaleDateString("es-CR") || "Sin fecha";
    tabla.innerHTML += `<tr>
      <td>${fecha}</td>
      <td>${d.descripcion}</td>
      <td>-</td>
      <td>₡${d.monto}</td>
    </tr>`;
    totalEgresos += d.monto;
  });

  const balance = totalIngresos - totalEgresos;
  totalesDiv.innerHTML = `
    <p><strong>Total Ingresos:</strong> ₡${totalIngresos}</p>
    <p><strong>Total Egresos:</strong> ₡${totalEgresos}</p>
    <p><strong>Balance:</strong> ${balance >= 0 ? "🟢" : "🔴"} ₡${balance}</p>
  `;
}

// --- Autenticación ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUID = user.uid;
    cargarMovimientos();
  } else {
    alert("⚠️ Debes iniciar sesión.");
    window.location.href = "index.html";
  }
});

// --- Cerrar sesión ---
function cerrarSesion() {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  }).catch((error) => {
    alert("❌ Error al cerrar sesión: " + error.message);
  });
}
