import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tipoSelect = document.getElementById("tipo");
  const btnRegistrar = document.getElementById("btnRegistrar");
  const btnNuevo = document.getElementById("btnNuevo");
  const btnCerrar = document.getElementById("btnCerrar");

  tipoSelect.addEventListener("change", mostrarCampos);
  btnRegistrar.addEventListener("click", registrarPesaje);
  btnNuevo.addEventListener("click", nuevoPesaje);
  btnCerrar.addEventListener("click", cerrarSesion);
});

// --- Mostrar campos según tipo ---
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

// --- Agregar material extra ---
window.agregarMaterial = function() {
  const mat = document.getElementById("materialSelect").value;
  const peso = parseFloat(document.getElementById("pesoMaterial").value) || 0;

  if (!mat || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  const lista = document.getElementById("listaExtras");
  const item = document.createElement("p");
  item.textContent = `${peso} kg de ${mat}`;
  item.dataset.material = mat;
  item.dataset.peso = peso;

  const btnQuitar = document.createElement("button");
  btnQuitar.textContent = "❌";
  btnQuitar.type = "button";
  btnQuitar.onclick = () => item.remove();

  item.appendChild(btnQuitar);
  lista.appendChild(item);

  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
};

// --- Obtener precios desde inputs ---
function obtenerPrecios() {
  const precios = {};
  document.querySelectorAll("#precios input").forEach(input => {
    const mat = input.id.replace("precio-", "");
    precios[mat] = parseFloat(input.value) || 0;
  });
  return precios;
}

// --- Registrar pesaje ---
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

  const materiales = [{ material: "Hierro", peso: neto }];

  document.querySelectorAll("#listaExtras p").forEach(p => {
    const mat = p.dataset.material;
    const peso = parseFloat(p.dataset.peso);
    materiales.push({ material: mat, peso });
  });

  const precios = obtenerPrecios();

  const materialesConTotal = materiales.map(m => {
    const precioUnit = precios[m.material] || 0;
    const total = m.peso * precioUnit;
    return { ...m, precioUnit, total };
  });

  const totalGeneral = materialesConTotal.reduce((acc, m) => acc + m.total, 0);

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo,
      materiales: materialesConTotal,
      totalGeneral,
      fecha: Timestamp.now()
    });

    // 👇 actualizar inventario también
    await actualizarInventario(materiales);

    resultadoDiv.innerHTML =
      `✅ Registrado:<br>${materialesConTotal.map(m =>
        `${m.peso} kg de ${m.material} × ₡${m.precioUnit} = ₡${m.total}`
      ).join("<br>")}<br><br>
      <strong>Total general: ₡${totalGeneral}</strong>`;
  } catch (e) {
    resultadoDiv.innerText = "❌ Error al guardar: " + e.message;
  }
}

// --- Actualizar inventario ---
async function actualizarInventario(materiales) {
  const uid = auth?.currentUser?.uid || "desconocido";
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  let datos = {};
  if (snap.exists()) {
    datos = snap.data().materiales || {};
  }

  materiales.forEach(m => {
    if (!datos[m.material]) datos[m.material] = 0;
    datos[m.material] += m.peso;
  });

  await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });
}

// --- Nuevo pesaje ---
function nuevoPesaje() {
  document.getElementById("resultado").innerText = "";
  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
  document.getElementById("listaExtras").innerHTML = "";
}

// --- Cerrar sesión ---
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
