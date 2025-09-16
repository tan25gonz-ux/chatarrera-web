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
      <button id="btnRegistrar">Registrar Pesaje</button>
    `;
  }

  if (tipo === "camionPequeno") {
    html += `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      <button id="btnRegistrar">Registrar Pesaje</button>
    `;
  }

  if (tipo === "carreta" || tipo === "mano") {
    mostrarFormularioMaterial(tipo); // directo porque no es hierro
    return;
  }

  contenedor.innerHTML = html;

  if (document.getElementById("btnRegistrar")) {
    document.getElementById("btnRegistrar").addEventListener("click", () => calcularCamion(tipo));
  }
}

async function calcularCamion(tipo) {
  let neto = 0;

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

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth.currentUser.email,
      tipo: tipo,
      material: "hierro",
      pesoNeto: neto,
      fecha: Timestamp.now()
    });
    document.getElementById("resultado").innerText =
      `✅ Registrado: ${neto} kg de hierro`;

    // Preguntar si trae otros materiales
    document.getElementById("resultado").innerHTML += `
      <div style="margin-top:20px;">
        <p>¿Trae algún otro material?</p>
        <button id="siMaterial">Sí</button>
        <button id="noMaterial">No</button>
      </div>
    `;

    document.getElementById("siMaterial").addEventListener("click", () => {
      mostrarFormularioMaterial("extra");
    });
    document.getElementById("noMaterial").addEventListener("click", () => {
      document.getElementById("resultado").innerText = "🚚 Pesaje completado.";
    });

  } catch (e) {
    document.getElementById("resultado").innerText =
      "❌ Error al guardar: " + e.message;
  }
}

function mostrarFormularioMaterial(tipo) {
  const contenedor = document.getElementById("formularioPesaje");
  contenedor.innerHTML = `
    <h3>Otro Material</h3>
    <label>Material:</label>
    <select id="material">
      <option value="cobre">Cobre</option>
      <option value="bronce">Bronce</option>
      <option value="aluminio">Aluminio</option>
      <option value="otros">Otros</option>
    </select>
  `;

  if (tipo === "carreta") {
    contenedor.innerHTML += `
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "mano" || tipo === "extra") {
    contenedor.innerHTML += `
      <label>Peso directo (kg): <input type="number" id="peso"></label>
    `;
  }

  contenedor.innerHTML += `<button id="btnRegistrar">Registrar Material</button>`;
  document.getElementById("btnRegistrar").addEventListener("click", () => calcularMaterial(tipo));
}

async function calcularMaterial(tipo) {
  let neto = 0;
  let material = document.getElementById("material").value;

  if (tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "mano" || tipo === "extra") {
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

// Cerrar sesión
window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};
