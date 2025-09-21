import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnIngreso").addEventListener("click", () => registrar("ingresos"));
  document.getElementById("btnEgreso").addEventListener("click", () => registrar("egresos"));

  // Acordeón
  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });

  cargarContabilidad();
});

async function registrar(tipo) {
  const desc = document.getElementById(tipo === "ingresos" ? "descIngreso" : "descEgreso").value;
  const monto = parseFloat(document.getElementById(tipo === "ingresos" ? "montoIngreso" : "montoEgreso").value) || 0;

  if (!desc || monto <= 0) {
    alert("Complete todos los campos correctamente");
    return;
  }

  try {
    await addDoc(collection(db, "contabilidad", auth.currentUser.uid, tipo), {
      descripcion: desc,
      monto,
      fecha: Timestamp.now()
    });
    cargarContabilidad();
  } catch (e) {
    alert("❌ Error: " + e.message);
  }
}

async function cargarContabilidad() {
  const ingresosSnap = await getDocs(collection(db, "contabilidad", auth.currentUser.uid, "ingresos"));
  const egresosSnap = await getDocs(collection(db, "contabilidad", auth.currentUser.uid, "egresos"));

  const tabla = document.querySelector("#tablaContabilidad tbody");
  tabla.innerHTML = "";
  let totalIngresos = 0;
  let totalEgresos = 0;

  ingresosSnap.forEach(doc => {
    const d = doc.data();
    totalIngresos += d.monto;
    tabla.innerHTML += `<tr><td style="color:green">Ingreso</td><td>${d.descripcion}</td><td>₡${d.monto}</td><td>${d.fecha.toDate().toLocaleString()}</td></tr>`;
  });

  egresosSnap.forEach(doc => {
    const d = doc.data();
    totalEgresos += d.monto;
    tabla.innerHTML += `<tr><td style="color:red">Egreso</td><td>${d.descripcion}</td><td>₡${d.monto}</td><td>${d.fecha.toDate().toLocaleString()}</td></tr>`;
  });

  document.getElementById("balance").innerText = `💰 Balance: ₡${totalIngresos - totalEgresos}`;
}
