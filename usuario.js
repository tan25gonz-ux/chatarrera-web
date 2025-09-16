import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Función para crear un formulario nuevo
window.agregarFormulario = function () {
  const cont = document.getElementById("formularios");

  const form = document.createElement("div");
  form.classList.add("card", "formulario");

  form.innerHTML = `
    <label>Identificador (Placa o Cédula):</label>
    <input type="text" class="identificador" placeholder="Ej: ABC123 o 1-2345-6789">

    <label>Tipo de transporte:</label>
    <select class="tipo" onchange="mostrarCampos(this)">
      <option value="">-- Seleccione --</option>
      <option value="camionGrande">Camión Grande</option>
      <option value="camionPequeno">Camión Pequeño</option>
      <option value="carreta">Carreta</option>
      <option value="mano">A Mano</option>
    </select>

    <div class="campos"></div>

    <button onclick="registrarPesaje(this)">Registrar</button>
    <div class="resultado"></div>
  `;

  cont.appendChild(form);
};

// Mostrar campos dinámicos dentro del formulario correspondiente
window.mostrarCampos = function (select) {
  const tipo = select.value;
  const campos = select.closest(".formulario").querySelector(".campos");
  campos.innerHTML = "";

  if (tipo === "camionGrande") {
    campos.innerHTML = `
      <h3>Camión Grande (Hierro)</h3>
      <label>Delantera llena (kg): <input type="number" class="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" class="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" class="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" class="traseraVacia"></label>
    `;
  }

  if (tipo === "camionPequeno") {
    campos.innerHTML = `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Peso lleno (kg): <input type="number" class="lleno"></label>
      <label>Peso vacío (kg): <input type="number" class="vacio"></label>
    `;
  }

  if (tipo === "carreta") {
    campos.innerHTML = `
      <h3>Carreta</h3>
      <label>Material:</label>
      <select class="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
      <label>Peso lleno (kg): <input type="number" class="lleno"></label>
      <label>Peso vacío (kg): <input type="number" class="vacio"></label>
    `;
  }

  if (tipo === "mano") {
    campos.innerHTML = `
      <h3>A Mano</h3>
      <label>Material:</label>
      <select class="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
      <label>Peso directo (kg): <input type="number" class="peso"></label>
    `;
  }
};

// Registrar pesaje en Firebase
window.registrarPesaje = async function (btn) {
  const form = btn.closest(".formulario");
  const tipo = form.querySelector(".tipo").value;
  const identificador = form.querySelector(".identificador").value.trim();
  const resultadoDiv = form.querySelector(".resultado");

  if (!tipo || !identificador) {
    alert("Debe ingresar un identificador y seleccionar un tipo.");
    return;
  }

  let neto = 0;
  let material = "hierro";

  if (tipo === "camionGrande") {
    const delanteraLlena = parseFloat(form.querySelector(".delanteraLlena").value) || 0;
    const traseraLlena = parseFloat(form.querySelector(".traseraLlena").value) || 0;
    const delanteraVacia = parseFloat(form.querySelector(".delanteraVacia").value) || 0;
    const traseraVacia = parseFloat(form.querySelector(".traseraVacia").value) || 0;
    neto = (delanteraLlena + traseraLlena) - (delanteraVacia + traseraVacia);
  }

  if (tipo === "camionPequeno") {
    const lleno = parseFloat(form.querySelector(".lleno").value) || 0;
    const vacio = parseFloat(form.querySelector(".vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "carreta") {
    const lleno = parseFloat(form.querySelector(".lleno").value) || 0;
    const vacio = parseFloat(form.querySelector(".vacio").value) || 0;
    neto = lleno - vacio;
    material = form.querySelector(".material").value;
  }

  if (tipo === "mano") {
    neto = parseFloat(form.querySelector(".peso").value) || 0;
    material = form.querySelector(".material").value;
  }

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      identificador,
      tipo,
      material,
      pesoNeto: neto,
      fecha: Timestamp.now()
    });
    resultadoDiv.innerHTML =
      `✅ Registrado: ${neto} kg de ${material} para ${identificador}`;
  } catch (e) {
    resultadoDiv.innerText = "❌ Error al guardar: " + e.message;
  }
};

// Cerrar sesión
window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};

// Al cargar la página, añadimos el primer formulario
window.addEventListener("DOMContentLoaded", () => {
  agregarFormulario();
});
