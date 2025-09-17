import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tipoSelect = document.getElementById("tipo");
  const btnRegistrar = document.getElementById("btnRegistrar");
  const btnNuevo = document.getElementById("btnNuevo");
  const btnCerrar = document.getElementById("btnCerrar");
  const btnAgregarExtra = document.getElementById("btnAgregarExtra");

  tipoSelect.addEventListener("change", mostrarCampos);
  btnRegistrar.addEventListener("click", registrarPesaje);
  btnNuevo.addEventListener("click", nuevoPesaje);
  btnCerrar.addEventListener("click", cerrarSesion);
  btnAgregarExtra.addEventListener("click", agregarExtra);
});

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
      <h3>Carreta (Hierro por defecto)</h3>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "mano") {
    campos.innerHTML = `
      <h3>A Mano (Hierro por defecto)</h3>
      <label>Peso directo (kg): <input type="number" id="peso"></label>
    `;
  }
}

function agregarExtra() {
  const lista = document.getElementById("listaExtras");

  const div = document.createElement("div");
  div.classList.add("extra");

  div.innerHTML = `
    <label>Material:</label>
    <select class="extraMaterial">
      <option value="cobre">Cobre</option>
      <option value="bronce">Bronce</option>
      <option value="aluminio">Aluminio</option>
      <option value="batería">Batería</option>
      <option value="acero">Acero</option>
      <option value="cable">Cable</option>
      <option value="catalizador">Catalizador</option>
      <option value="plástico de lavadora">Plástico de lavadora</option>
      <option value="plástico de caja">Plástico de caja</option>
      <option value="carrocería">Carrocería</option>
    </select>
    <label>Peso (kg): <input type="number" class="extraPeso"></label>
    <button class="btnQuitar">❌ Quitar</button>
  `;

  div.querySelector(".btnQuitar").addEventListener("click", () => {
    div.remove();
  });

  lista.appendChild(div);
}

async function registrarPesaje() {
  const tipo = document.getElementById("tipo").value;
  const resultadoDiv = document.getElementById("resultado");

  if (!tipo) {
    alert("Seleccione un tipo primero");
    return;
  }

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

  if (tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("peso").value) || 0;
  }

  // Hierro siempre
  const materiales = [{ material: "Hierro", peso: neto }];

  // Agregar extras
  document.querySelectorAll("#listaExtras .extra").forEach(extra => {
    const mat = extra.querySelector(".extraMaterial").value;
    const peso = parseFloat(extra.querySelector(".extraPeso").value) || 0;
    if (peso > 0) {
      materiales.push({ material: mat, peso });
    }
  });

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo,
      materiales,
      fecha: Timestamp.now()
    });

    await actualizarInventario(materiales);

    resultadoDiv.innerHTML = `✅ Registrado:<br>
      ${materiales.map(m => `${m.peso} kg de ${m.material}`).join("<br>")}`;
  } catch (e) {
    resultadoDiv.innerText = "❌ Error al guardar: " + e.message;
  }
}

async function actualizarInventario(materiales) {
  const uid = auth?.currentUser?.uid || "desconocido";

  // calcular semana actual
  const ahora = new Date();
  const año = ahora.getFullYear();
  const semana = Math.ceil((((ahora - new Date(año, 0, 1)) / 86400000) + new Date(año, 0, 1).getDay() + 1) / 7);
  const docId = `${uid}_${año}-W${semana}`;

  const docRef = doc(db, "inventarios", docId);
  const snap = await getDoc(docRef);
  let datos = {};

  if (snap.exists()) {
    datos = snap.data().materiales;
  }

  materiales.forEach(m => {
    if (!datos[m.material]) datos[m.material] = 0;
    datos[m.material] += m.peso;
  });

  await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });
}

function nuevoPesaje() {
  document.getElementById("resultado").innerText = "";
  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
  document.getElementById("listaExtras").innerHTML = "";
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
