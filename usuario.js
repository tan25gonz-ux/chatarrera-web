import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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
document.getElementById("tipo").addEventListener("change", mostrarCampos);

// --- Agregar material extra ---
window.agregarMaterial = function() {
  const mat = document.getElementById("materialSelect").value;
  const peso = parseFloat(document.getElementById("pesoMaterial").value) || 0;
  if (!mat || peso <= 0) return;

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
    neto = (parseFloat(document.getElementById("delanteraLlena").value) || 0) +
           (parseFloat(document.getElementById("traseraLlena").value) || 0) -
           (parseFloat(document.getElementById("delanteraVacia").value) || 0) -
           (parseFloat(document.getElementById("traseraVacia").value) || 0);
  }
  if (tipo === "camionPequeno") {
    neto = (parseFloat(document.getElementById("lleno").value) || 0) -
           (parseFloat(document.getElementById("vacio").value) || 0);
  }
  if (tipo === "carreta") {
    neto = (parseFloat(document.getElementById("lleno").value) || 0) -
           (parseFloat(document.getElementById("vacio").value) || 0);
  }
  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("peso").value) || 0;
  }

  const materiales = [];
  if (neto > 0) {
    materiales.push({ material: "Hierro", peso: neto });
  }
  document.querySelectorAll("#listaExtras p").forEach(p => {
    const mat = p.dataset.material;
    const peso = parseFloat(p.dataset.peso);
    if (mat && peso > 0) materiales.push({ material: mat, peso });
  });

  if (materiales.length === 0) {
    alert("Debe registrar al menos un material con peso válido.");
    return;
  }

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo,
      materiales,
      fecha: Timestamp.now()
    });

    await actualizarInventario(materiales);

    resultadoDiv.innerHTML = `✅ Registrado:<br>${materiales.map(m => `${m.peso} kg de ${m.material}`).join("<br>")}`;
  } catch (e) {
    resultadoDiv.innerText = "❌ Error al guardar: " + e.message;
  }
}
document.getElementById("btnRegistrar").addEventListener("click", registrarPesaje);

// --- Actualizar inventario por usuario ---
async function actualizarInventario(materiales) {
  const uid = auth?.currentUser?.uid || "anonimo";
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);
  let datos = {};

  if (snap.exists()) datos = snap.data().materiales || {};

  materiales.forEach(m => {
    if (!datos[m.material]) datos[m.material] = 0;
    datos[m.material] += m.peso;
  });

  await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });
}

// --- Nuevo pesaje ---
document.getElementById("btnNuevo").addEventListener("click", () => {
  document.getElementById("resultado").innerText = "";
  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
  document.getElementById("listaExtras").innerHTML = "";
});

// --- Cerrar sesión ---
document.getElementById("btnCerrar").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "index.html";
});
