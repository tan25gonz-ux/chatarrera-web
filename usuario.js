import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Cuando cargue la página, conectamos eventos
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tipo").addEventListener("change", mostrarCampos);
  document.getElementById("btnRegistrar").addEventListener("click", registrarPesaje);
  document.getElementById("btnSalir").addEventListener("click", cerrarSesion);
});

// Mostrar campos según tipo
function mostrarCampos() {
  const tipo = document.getElementById("tipo").value;
  const campos = document.getElementById("campos");
  campos.innerHTML = "";

  if (tipo === "camionGrande") {
    campos.innerHTML = `
      <h3>Camión Grande (Hierro)</h3>
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
    `;
  }

  if (tipo === "camionPequeno") {
    campos.innerHTML = `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "carreta") {
    campos.innerHTML = `
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
    campos.innerHTML = `
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
}

// Registrar pesaje
async function registrarPesaje() {
  const tipo = document.getElementById("tipo").value;
  const identificador = document.getElementById("identificador").value.trim();
  if (!tipo || !identificador) {
    alert("Debe ingresar un identificador y seleccionar un tipo.");
    return;
  }

  let neto = 0;
  let material = "hierro";
  let estado = "finalizado";

  if (tipo === "camionGrande") {
    const delanteraLlena = parseFloat(document.getElementById("delanteraLlena").value) || 0;
    const traseraLlena = parseFloat(document.getElementById("traseraLlena").value) || 0;
    const delanteraVacia = parseFloat(document.getElementById("delanteraVacia").value) || 0;
    const traseraVacia = parseFloat(document.getElementById("traseraVacia").value) || 0;
    neto = (delanteraLlena + traseraLlena) - (delanteraVacia + traseraVacia);
    estado = "pendiente";
  }

  if (tipo === "camionPequeno") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
    estado = "pendiente";
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
      usuario: auth?.currentUser?.email || "desconocido",
      identificador,
      tipo,
      material,
      pesoNeto: neto,
      estado,
      fecha: Timestamp.now()
    });

    if (tipo.includes("camion")) {
      document.getElementById("resultado").innerHTML = `
        ✅ Registrado: ${neto} kg de hierro para ${identificador}<br><br>
        ¿Trae otro material?<br>
        <button id="btnExtra">Sí</button>
        <button id="btnFin">No</button>
      `;
      document.getElementById("btnExtra").addEventListener("click", () => mostrarExtra(identificador));
      document.getElementById("btnFin").addEventListener("click", finalizar);
    } else {
      document.getElementById("resultado").innerHTML =
        `✅ Registrado: ${neto} kg de ${material} para ${identificador}<br><br>
         <button id="btnNuevo">Nuevo Pesaje</button>`;
      document.getElementById("btnNuevo").addEventListener("click", nuevoPesaje);
    }
  } catch (e) {
    document.getElementById("resultado").innerText =
      "❌ Error al guardar: " + e.message;
  }
}

// Mostrar formulario extra
function mostrarExtra(identificador) {
  document.getElementById("resultado").innerHTML = `
    <h3>Otro Material para ${identificador}</h3>
    <label>Material:</label>
    <select id="materialExtra">
      <option value="cobre">Cobre</option>
      <option value="bronce">Bronce</option>
      <option value="aluminio">Aluminio</option>
      <option value="otros">Otros</option>
    </select>
    <label>Peso directo (kg): <input type="number" id="pesoExtra"></label>
    <button id="btnRegistrarExtra">Registrar Material</button>
  `;
  document.getElementById("btnRegistrarExtra").addEventListener("click", () => registrarExtra(identificador));
}

// Guardar extra
async function registrarExtra(identificador) {
  const material = document.getElementById("materialExtra").value;
  const neto = parseFloat(document.getElementById("pesoExtra").value) || 0;

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      identificador,
      tipo: "extra",
      material,
      pesoNeto: neto,
      estado: "finalizado",
      fecha: Timestamp.now()
    });

    document.getElementById("resultado").innerHTML =
      `✅ Registrado: ${neto} kg de ${material} para ${identificador}<br><br>
       <button id="btnNuevo">Nuevo Pesaje</button>`;
    document.getElementById("btnNuevo").addEventListener("click", nuevoPesaje);
  } catch (e) {
    document.getElementById("resultado").innerText =
      "❌ Error al guardar: " + e.message;
  }
}

// Finalizar
function finalizar() {
  document.getElementById("resultado").innerHTML =
    `🚚 Pesaje completado.<br><br>
     <button id="btnNuevo">Nuevo Pesaje</button>`;
  document.getElementById("btnNuevo").addEventListener("click", nuevoPesaje);
}

// Nuevo pesaje
function nuevoPesaje() {
  document.getElementById("resultado").innerText = "";
  document.getElementById("identificador").value = "";
  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
}

// Cerrar sesión
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
