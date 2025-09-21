import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, addDoc, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let chartDona;
let chartBarras;

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

  // ✅ Esperar a que el usuario esté autenticado antes de cargar
  onAuthStateChanged(auth, user => {
    if (user) {
      cargarContabilidad(user.uid);
    } else {
      console.warn("⚠️ Usuario no autenticado");
    }
  });
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
    cargarContabilidad(auth.currentUser.uid);
  } catch (e) {
    alert("❌ Error: " + e.message);
  }
}

async function cargarContabilidad(uid) {
  const ingresosSnap = await getDocs(collection(db, "contabilidad", uid, "ingresos"));
  const egresosSnap = await getDocs(collection(db, "contabilidad", uid, "egresos"));

  const tabla = document.querySelector("#tablaContabilidad tbody");
  tabla.innerHTML = "";
  let totalIngresos = 0;
  let totalEgresos = 0;
  const historico = {};

  ingresosSnap.forEach(doc => {
    const d = doc.data();
    totalIngresos += d.monto;
    const fecha = d.fecha?.toDate ? d.fecha.toDate().toLocaleString() : "Sin fecha";
    tabla.innerHTML += `<tr><td style="color:green">Ingreso</td><td>${d.descripcion}</td><td>₡${d.monto}</td><td>${fecha}</td></tr>`;
    const mes = obtenerMes(d.fecha?.toDate ? d.fecha.toDate() : new Date());
    if (!historico[mes]) historico[mes] = { ingresos: 0, egresos: 0 };
    historico[mes].ingresos += d.monto;
  });

  egresosSnap.forEach(doc => {
    const d = doc.data();
    totalEgresos += d.monto;
    const fecha = d.fecha?.toDate ? d.fecha.toDate().toLocaleString() : "Sin fecha";
    tabla.innerHTML += `<tr><td style="color:red">Egreso</td><td>${d.descripcion}</td><td>₡${d.monto}</td><td>${fecha}</td></tr>`;
    const mes = obtenerMes(d.fecha?.toDate ? d.fecha.toDate() : new Date());
    if (!historico[mes]) historico[mes] = { ingresos: 0, egresos: 0 };
    historico[mes].egresos += d.monto;
  });

  document.getElementById("balance").innerText = `💰 Balance: ₡${totalIngresos - totalEgresos}`;

  actualizarGrafico(totalIngresos, totalEgresos);
  actualizarHistorico(historico);
}

function obtenerMes(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${año}-${mes}`;
}

function actualizarGrafico(ingresos, egresos) {
  const ctx = document.getElementById("graficoContabilidad").getContext("2d");

  if (chartDona) chartDona.destroy();

  chartDona = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{
        data: [ingresos, egresos],
        backgroundColor: ["#39d353", "#ff4d4d"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function actualizarHistorico(historico) {
  const ctx = document.getElementById("graficoHistorico").getContext("2d");

  if (chartBarras) chartBarras.destroy();

  const labels = Object.keys(historico).sort();
  const ingresosData = labels.map(m => historico[m].ingresos);
  const egresosData = labels.map(m => historico[m].egresos);

  chartBarras = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ingresos",
          data: ingresosData,
          backgroundColor: "#39d353"
        },
        {
          label: "Egresos",
          data: egresosData,
          backgroundColor: "#ff4d4d"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
