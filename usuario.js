import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Registrar camión (hierro fijo)
window.registrarCamion = async function (tipo) {
  let neto = 0;

  if (tipo === "camionGrande") {
    const delanteraLlena = parseFloat(document.getElementById("delanteraLlena").value) || 0;
    const traseraLlena = parseFloat(document.getElementById("traseraLlena").value) || 0;
    const delanteraVacia = parseFloat(document.getElementById("delanteraVacia").value) || 0;
    const traseraVacia = parseFloat(document.getElementById("traseraVacia").value) || 0;
    neto = (delanteraLlena + traseraLlena) - (delanteraVacia + traseraVacia);
  }

  if (tipo === "camionPequeno") {
    const lleno = parseFloat(document.getElementById("llenoCamion").value) || 0;
    const vacio = parseFloat(document.getElementById("vacioCamion").value) || 0;
    neto = lleno - vacio;
  }

  await guardarPesaje(tipo, "hierro", neto);

  document.getElementById("resultado").innerHTML = `
    ✅ Registrado: ${neto} kg de hierro<br><br>
    ¿Trae otro material?<br>
    <button onclick="mostrarExtra()">Sí</button>
    <button onclick="finalizar()">No</button>
  `;
};

// Registrar carreta, mano o extra
window.registrarMaterial = async function (tipo) {
  let neto = 0;
  let material = "";

  if (tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("llenoCarreta").value) || 0;
    const vacio = parseFloat(document.getElementById("vacioCarreta").value) || 0;
    neto = lleno - vacio;
    material = document.getElementById("materialCarreta").value;
  }

  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("pesoMano").value) || 0;
    material = document.getElementById("materialMano").value;
  }

  if (tipo === "extra") {
    neto = parseFloat(document.getElementById("pesoExtra").value) || 0;
    material = document.getElementById("materialExtra").value;
  }

  await guardarPesaje(tipo, material, neto);

  document.getElementById("resultado").innerHTML =
    `✅ Registrado: ${neto} kg de ${material}<br><br><button onclick="finalizar()">Finalizar</button>`;
};

// Guardar en Firestore
async function guardarPesaje(tipo, material, neto) {
  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth.currentUser.email,
      tipo: tipo,
      material: material,
      pesoNeto: neto,
      fecha: Timestamp.now()
    });
  } catch (e) {
    alert("❌ Error al guardar: " + e.message);
  }
}

// Mostrar formulario extra después del camión
window.mostrarExtra = function () {
  document.getElementById("resultado").innerHTML = `
    <h3>Otro Material</h3>
    <label>Material:</label>
    <select id="materialExtra">
      <option value="cobre">Cobre</option>
      <option value="bronce">Bronce</option>
      <option value="aluminio">Aluminio</option>
      <option value="otros">Otros</option>
    </select>
    <label>Peso directo (kg): <input type="number" id="pesoExtra"></label>
    <button onclick="registrarMaterial('extra')">Registrar Material</button>
  `;
};

// Finalizar flujo
window.finalizar = function () {
  document.getElementById("resultado").innerHTML = `
    🚚 Pesaje completado.<br><br>
    <button onclick="nuevoPesaje()">Nuevo Pesaje</button>
  `;
};

window.nuevoPesaje = function () {
  // Limpia formulario y vuelve al inicio
  document.getElementById("resultado").innerText = "";
  document.getElementById("delanteraLlena")?.value = "";
  document.getElementById("traseraLlena")?.value = "";
  document.getElementById("delanteraVacia")?.value = "";
  document.getElementById("traseraVacia")?.value = "";
  document.getElementById("llenoCamion")?.value = "";
  document.getElementById("vacioCamion")?.value = "";
  document.getElementById("llenoCarreta")?.value = "";
  document.getElementById("vacioCarreta")?.value = "";
  document.getElementById("pesoMano")?.value = "";
  document.getElementById("pesoExtra")?.value = "";
  document.getElementById("materialCarreta")?.selectedIndex = 0;
  document.getElementById("materialMano")?.selectedIndex = 0;
  document.getElementById("materialExtra")?.selectedIndex = 0;
};


// Cerrar sesión
window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};
