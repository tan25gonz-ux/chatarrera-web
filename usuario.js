import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.getElementById("tipo").addEventListener("change", mostrarFormulario);

function mostrarFormulario() {
  const tipo = document.getElementById("tipo").value;
  const contenedor = document.getElementById("formularioPesaje");
  contenedor.innerHTML = "";

  let html = `
    <label>Material:</label>
    <select id="material">
      <option value="cobre">Cobre</option>
      <option value="bronce">Bronce</option>
      <option value="aluminio">Aluminio</option>
      <option value="hierro">Hierro</option>
      <option value="otros">Otros</option>
    </select>
  `;

  if (tipo === "camionGrande") {
    html += `
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
    `;
  }

  if (tipo === "camionPequeno" || tipo === "carreta") {
    html += `
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "mano") {
    html += `<label>Peso directo (kg): <input type="number" id="peso"></label>`;
  }

  html += `<button id="btnRegistrar">Registrar Pesaje</button>`;
  contenedor.innerHTML = html;

  document.getElementById("btnRegistrar").addEventListener("click", () => calcularPeso(tipo));
}

async function calcularPeso(tipo) {
  let neto = 0;
  let material = document.getElementById("material").value;

  if (tipo === "camionGrande") {
    const delanteraLlena = parseFloat(document.getElementById("delanteraLlena").value) || 0;
    const traseraLlena = parseFloat(document.getElementById("traseraLlena").value) || 0;
    const delanteraVacia = parseFloat(document.getElementById("delanteraVacia").value) || 0;
    const traseraVacia = parseFloat(document.getElementById("traseraVacia").value) || 0;
    neto = (delanteraLlena + traseraLlena) - (delanteraVacia + traseraVacia);
  }

  if (tipo === "camionPequeno" || tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("peso").value) || 0;
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

window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};