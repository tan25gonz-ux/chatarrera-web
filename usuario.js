import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Paso 1 → Paso 2
window.siguientePaso = function () {
  const tipo = document.getElementById("tipo").value;
  if (!tipo) {
    alert("Seleccione un tipo de transporte");
    return;
  }
  document.getElementById("paso1").classList.remove("activo");
  document.getElementById("paso2").classList.add("activo");
  mostrarFormulario(tipo);
};

function mostrarFormulario(tipo) {
  const contenedor = document.getElementById("formularioPesaje");
  contenedor.innerHTML = "";

  if (tipo === "camionGrande") {
    contenedor.innerHTML = `
      <h3>Camión Grande (Hierro)</h3>
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
      <button onclick="registrarCamion('${tipo}')">Registrar</button>
    `;
  }

  if (tipo === "camionPequeno") {
    contenedor.innerHTML = `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      <button onclick="registrarCamion('${tipo}')">Registrar</button>
    `;
  }

  if (tipo === "carreta") {
    contenedor.innerHTML = `
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
      <button onclick="registrarMaterial('carreta')">Registrar</button>
    `;
  }

  if (tipo === "mano") {
    contenedor.innerHTML = `
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
      <button onclick="registrarMaterial('mano')">Registrar</button>
    `;
  }
}

// Registrar camión (siempre hierro)
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
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  await guardarPesaje(tipo, "hierro", neto);

  // Mostrar paso 3 + pregunta de más materiales
  document.getElementById("paso2").classList.remove("activo");
  document.getElementById("paso3").classList.add("activo");
  document.getElementById("resultado").innerHTML = `
    ✅ Registrado: ${neto} kg de hierro<br><br>
    ¿Trae otro material?<br>
    <button onclick="mostrarFormulario('extra')">Sí</button>
    <button onclick="finalizar()">No</button>
  `;
};

// Registrar carreta, mano o extra
window.registrarMaterial = async function (tipo) {
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

  await guardarPesaje(tipo, material, neto);

  document.getElementById("paso2").classList.remove("activo");
  document.getElementById("paso3").classList.add("activo");
  document.getElementById("resultado").innerHTML =
    `✅ Registrado: ${neto} kg de ${material}<br><br><button onclick="finalizar()">Finalizar</button>`;
};

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

window.finalizar = function () {
  document.getElementById("resultado").innerText = "🚚 Pesaje completado.";
};

// Cerrar sesión
window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};
