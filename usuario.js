import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Detectar cuando se cambia el tipo de transporte
document.getElementById("tipo").addEventListener("change", mostrarFormulario);

function mostrarFormulario() {
  const tipo = document.getElementById("tipo").value;
  const contenedor = document.getElementById("formularioPesaje");
  contenedor.innerHTML = "";

  let html = "";

  if (tipo === "camionGrande") {
    html += `
      <h3>Camión Grande (Hierro)</h3>
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
    `;
  }

  if (tipo === "camionPequeno") {
    html += `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "carreta") {
    html += `
      <h3>Carreta</h3>
      <label>Material:</label>
      <select id="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "mano") {
    html += `
      <h3>A Mano</h3>
      <label>Material:</label>
      <select id="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
      <label>Peso directo (kg): <input type="number" id="peso"></label>
    `;
  }

  html += `<button id="btnRegistrar">Registrar Pesaje</button>`;
  contenedor.innerHTML = html;

  // Evento de guardar pesaje
  document.getElementById("btnRegistrar").addEventListener("click", () => calcularPeso(tipo));
}

async function calcularPeso(tipo) {
  let neto = 0;
  let material = "hierro"; // por defecto (camiones)

  if (tipo === "camionGrande") {
    const delanteraLlena = parseFloat(document.getElementById("delanteraLlena").value) || 0;
    const traseraLlena = parseFloat(document.getElementById("traseraLlena").value) || 0;
    const delanteraVacia = parseFloat(document.getElementById("delanteraVacia").value) || 0;
    const traseraVacia = parseFloat(document.getElementById("traseraVacia").value) || 0;
    neto = (delanteraLlena + traseraLlena) - (delanteraVacia + traseraVacia);
  }

  if (tipo === "camionPequeno") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
    material = document.getElementById("material").value;
  }

  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("peso").value) || 0;
    material = document.getElementById("material").value;
  }

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth.currentUser.email,
      tipo: tipo,
      material: material,
      pesoNeto: neto,
      fecha: Timestamp.now()
    });
    document.getElementById("resultado").innerText =
      `✅ Registrado: ${neto} kg de ${material}`;
  } catch (e) {
    document.getElementById("resultado").innerText =
      "❌ Error al guardar: " + e.message;
  }
}

// Cerrar sesión
window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};
