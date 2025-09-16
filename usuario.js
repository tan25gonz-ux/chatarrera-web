import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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

  if (tipo === "carreta" || tipo === "mano") {
    html += `
      <label>Material:</label>
      <select id="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
    `;
    if (tipo === "carreta") {
      html += `
        <h3>Carreta</h3>
        <label>Peso lleno (kg): <input type="number" id="lleno"></label>
        <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      `;
    }
    if (tipo === "mano") {
      html += `
        <h3>A Mano</h3>
        <label>Peso directo (kg): <input type="number" id="peso"></label>
      `;
    }
  }

  html += `<button id="btnRegistrar">Registrar Pesaje</button>`;
  contenedor.innerHTML = html;

  document.getElementById("btnRegistrar").addEventListener("click", () => calcularPeso(tipo));
}
