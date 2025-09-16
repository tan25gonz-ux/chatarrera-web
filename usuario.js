// Asegúrate de que "firebase.js" exista en la misma carpeta y exporte { auth, db }
import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

/** Utilidad: atajo para querySelector */
const $ = (sel) => document.querySelector(sel);

/** Conectar eventos cuando el DOM está listo */
function init() {
  const tipoSel = $("#tipo");
  const btnRegistrar = $("#btnRegistrar");
  const btnSalir = $("#btnSalir");

  if (!tipoSel || !btnRegistrar) {
    console.error("No se encuentran #tipo o #btnRegistrar en el DOM.");
    return;
  }

  // Eventos
  tipoSel.addEventListener("change", mostrarCampos);
  btnRegistrar.addEventListener("click", registrarPesaje);
  btnSalir?.addEventListener("click", cerrarSesion);

  console.log("usuario.js listo ✅");
}

/** Pinta los inputs según el tipo elegido */
function mostrarCampos() {
  const tipo = $("#tipo").value;
  const cont = $("#campos");
  cont.innerHTML = "";

  if (tipo === "camionGrande") {
    cont.innerHTML = `
      <h3>Camión Grande (Hierro)</h3>
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena" /></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena" /></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia" /></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia" /></label>
    `;
  } else if (tipo === "camionPequeno") {
    cont.innerHTML = `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Peso lleno (kg): <input type="number" id="lleno" /></label>
      <label>Peso vacío (kg): <input type="number" id="vacio" /></label>
    `;
  } else if (tipo === "carreta") {
    cont.innerHTML = `
      <h3>Carreta</h3>
      <label>Material:</label>
      <select id="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
      <label>Peso lleno (kg): <input type="number" id="lleno" /></label>
      <label>Peso vacío (kg): <input type="number" id="vacio" /></label>
    `;
  } else if (tipo === "mano") {
    cont.innerHTML = `
      <h3>A Mano</h3>
      <label>Material:</label>
      <select id="material">
        <option value="cobre">Cobre</option>
        <option value="bronce">Bronce</option>
        <option value="aluminio">Aluminio</option>
        <option value="hierro">Hierro</option>
        <option value="otros">Otros</option>
      </select>
      <label>Peso directo (kg): <input type="number" id="peso" /></label>
    `;
  }
}

/** Registra un pesaje en Firestore */
async function registrarPesaje() {
  const tipo = $("#tipo").value;
  const identificador = $("#identificador").value.trim();
  const out = $("#resultado");

  if (!identificador || !tipo) {
    alert("Debe ingresar un identificador y seleccionar un tipo.");
    return;
  }

  let neto = 0;
  let material = "hierro";
  let estado = "finalizado";

  try {
    if (tipo === "camionGrande") {
      const delanteraLlena = parseFloat($("#delanteraLlena")?.value || "0");
      const traseraLlena   = parseFloat($("#traseraLlena")?.value   || "0");
      const delanteraVacia = parseFloat($("#delanteraVacia")?.value || "0");
      const traseraVacia   = parseFloat($("#traseraVacia")?.value   || "0");
      neto = (delanteraLlena + traseraLlena) - (delanteraVacia + traseraVacia);
      estado = "pendiente"; // puede traer más materiales
    } else if (tipo === "camionPequeno") {
      const lleno = parseFloat($("#lleno")?.value || "0");
      const vacio = parseFloat($("#vacio")?.value || "0");
      neto = lleno - vacio;
      estado = "pendiente";
    } else if (tipo === "carreta") {
      const lleno = parseFloat($("#lleno")?.value || "0");
      const vacio = parseFloat($("#vacio")?.value || "0");
      neto = lleno - vacio;
      material = $("#material").value;
    } else if (tipo === "mano") {
      neto = parseFloat($("#peso")?.value || "0");
      material = $("#material").value;
    } else {
      alert("Seleccione un tipo válido.");
      return;
    }

    // Guardar
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      identificador,
      tipo,
      material,
      pesoNeto: neto,
      estado,
      fecha: Timestamp.now()
    });

    if (tipo === "camionGrande" || tipo === "camionPequeno") {
      out.innerHTML = `
        ✅ Registrado: ${neto} kg de hierro para ${identificador}<br><br>
        ¿Trae otro material?<br>
        <button id="btnExtra">Sí</button>
        <button id="btnFin">No</button>
      `;
      $("#btnExtra").addEventListener("click", () => mostrarExtra(identificador));
      $("#btnFin").addEventListener("click", finalizar);
    } else {
      out.innerHTML = `
        ✅ Registrado: ${neto} kg de ${material} para ${identificador}<br><br>
        <button id="btnNuevo">Nuevo Pesaje</button>
      `;
      $("#btnNuevo").addEventListener("click", nuevoPesaje);
    }
  } catch (e) {
    console.error(e);
    out.textContent = "❌ Error al guardar: " + e.message;
  }
}

/** Formulario para material extra (tras camión) */
function mostrarExtra(identificador) {
  const out = $("#resultado");
  out.innerHTML = `
    <h3>Otro Material para ${identificador}</h3>
    <label>Material:</label>
    <select id="materialExtra">
      <option value="cobre">Cobre</option>
      <option value="bronce">Bronce</option>
      <option value="aluminio">Aluminio</option>
      <option value="otros">Otros</option>
    </select>
    <label>Peso directo (kg): <input type="number" id="pesoExtra" /></label>
    <button id="btnRegistrarExtra">Registrar Material</button>
  `;
  $("#btnRegistrarExtra").addEventListener("click", () => registrarExtra(identificador));
}

/** Guarda el material extra */
async function registrarExtra(identificador) {
  const material = $("#materialExtra").value;
  const neto = parseFloat($("#pesoExtra")?.value || "0");
  const out = $("#resultado");

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

    out.innerHTML = `
      ✅ Registrado: ${neto} kg de ${material} para ${identificador}<br><br>
      <button id="btnNuevo">Nuevo Pesaje</button>
    `;
    $("#btnNuevo").addEventListener("click", nuevoPesaje);
  } catch (e) {
    console.error(e);
    out.textContent = "❌ Error al guardar: " + e.message;
  }
}

/** Finalizar flujo sin extra */
function finalizar() {
  const out = $("#resultado");
  out.innerHTML = `
    🚚 Pesaje completado.<br><br>
    <button id="btnNuevo">Nuevo Pesaje</button>
  `;
  $("#btnNuevo").addEventListener("click", nuevoPesaje);
}

/** Reiniciar formulario */
function nuevoPesaje() {
  $("#resultado").textContent = "";
  $("#identificador").value = "";
  $("#tipo").value = "";
  $("#campos").innerHTML = "";
}

/** Salir */
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

// Iniciar
init();
