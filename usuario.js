import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  // Conectar el select "tipo" con mostrarCampos()
  const tipoSelect = document.getElementById("tipo");
  if (tipoSelect) {
    tipoSelect.addEventListener("change", mostrarCampos);
  } else {
    console.warn('No se encontró <select id="tipo"> en el DOM');
  }

  // Cargar precios cuando Firebase confirme el usuario
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarPrecios(user.uid);
    } else {
      console.warn("⚠ No hay usuario logueado");
    }
  });
});

// ---- UI: mostrar campos según tipo ----
function mostrarCampos() {
  const tipo = document.getElementById("tipo")?.value || "";
  const campos = document.getElementById("campos");
  if (!campos) return;

  let html = "";
  switch (tipo) {
    case "camionGrande":
      html = `
        <h3>Camión Grande (Hierro)</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Placa: <input type="text" id="placa"></label>
        <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
        <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
        <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
        <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
      `;
      break;

    case "camionPequeno":
      html = `
        <h3>Camión Pequeño (Hierro)</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Placa: <input type="text" id="placa"></label>
        <label>Peso lleno (kg): <input type="number" id="lleno"></label>
        <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      `;
      break;

    case "carreta":
      html = `
        <h3>Carreta</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Peso lleno (kg): <input type="number" id="lleno"></label>
        <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      `;
      break;

    case "mano":
      html = `
        <h3>A Mano</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Peso directo (kg): <input type="number" id="peso"></label>
      `;
      break;

    default:
      html = "";
  }

  campos.innerHTML = html;
}

// ---- Cargar precios desde Firestore (solo lectura en usuario.html) ----
async function cargarPrecios(uid) {
  const target = document.getElementById("preciosUsuario");
  if (!target) return;

  try {
    const ref = doc(db, "precios", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data().materiales || {};
      const html = Object.entries(data)
        .map(([mat, val]) => `<p><strong>${mat}:</strong> ₡${val}</p>`)
        .join("");
      target.innerHTML = html || "Sin datos.";
    } else {
      target.textContent = "❌ No hay precios configurados.";
    }
  } catch (err) {
    console.error("Error cargando precios:", err);
    target.textContent = "Error cargando precios.";
  }
}
