import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tipo")?.addEventListener("change", mostrarCampos);
  document.getElementById("btnRegistrar")?.addEventListener("click", registrarPesaje);
  document.getElementById("btnAgregarExtra")?.addEventListener("click", agregarMaterial);
  document.getElementById("btnCerrar")?.addEventListener("click", cerrarSesion);

  onAuthStateChanged(auth, (user) => {
    if (user) cargarPrecios(user.uid);
  });
});

// ---- UI dinámico según tipo ----
function mostrarCampos() {
  const tipo = document.getElementById("tipo")?.value || "";
  const campos = document.getElementById("campos");
  if (!campos) return;

  const bloques = {
    camionGrande: `
      <h3>Camión Grande (Hierro)</h3>
      <label>Nombre: <input type="text" id="nombre"></label>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Placa: <input type="text" id="placa"></label>
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
    `,
    camionPequeno: `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Nombre: <input type="text" id="nombre"></label>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Placa: <input type="text" id="placa"></label>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `,
    carreta: `
      <h3>Carreta</h3>
      <label>Nombre: <input type="text" id="nombre"></label>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `,
    mano: `
      <h3>A Mano</h3>
      <label>Nombre: <input type="text" id="nombre"></label>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Peso directo (kg): <input type="number" id="peso"></label>
    `
  };

  campos.innerHTML = bloques[tipo] || "";
}

// ---- Agregar material extra ----
function agregarMaterial() {
  const mat = document.getElementById("materialSelect")?.value || "";
  const peso = parseFloat(document.getElementById("pesoMaterial")?.value) || 0;
  if (!mat || peso <= 0) return alert("Seleccione un material y un peso válido");

  const lista = document.getElementById("listaExtras");
  if (!lista) return;

  const p = document.createElement("p");
  p.textContent = `${peso} kg de ${mat}`;
  p.dataset.material = mat;
  p.dataset.peso = String(peso);

  const b = document.createElement("button");
  b.textContent = "❌"; b.type = "button"; b.onclick = () => p.remove();
  p.appendChild(b);
  lista.appendChild(p);

  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
}

// ---- Cargar precios (solo lectura) ----
async function cargarPrecios(uid) {
  const div = document.getElementById("preciosUsuario");
  if (!div) return;
  try {
    const ref = doc(db, "precios", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) { div.textContent = "❌ No hay precios configurados."; return; }
    const mats = snap.data().materiales || {};
    div.innerHTML = Object.entries(mats).map(([k,v]) => `<p><strong>${k}:</strong> ₡${v}</p>`).join("");
  } catch (e) {
    console.error(e);
    div.textContent = "Error cargando precios.";
  }
}

// ---- Registrar pesaje + Factura recibo ----
async function registrarPesaje() {
  const tipo = document.getElementById("tipo")?.value;
  if (!tipo) return alert("Seleccione un tipo de transporte");

  const nombre = document.getElementById("nombre")?.value || "";
  const cedula = document.getElementById("cedula")?.value || "";
  const placa  = document.getElementById("placa")?.value || "";

  // Calcular neto
  let neto = 0;
  if (tipo === "camionGrande") {
    const dl = +document.getElementById("delanteraLlena")?.value || 0;
    const tl = +document.getElementById("traseraLlena")?.value || 0;
    const dv = +document.getElementById("delanteraVacia")?.value || 0;
    const tv = +document.getElementById("traseraVacia")?.value || 0;
    neto = (dl + tl) - (dv + tv);
  } else if (tipo === "camionPequeno" || tipo === "carreta") {
    const lleno = +document.getElementById("lleno")?.value || 0;
    const vacio = +document.getElementById("vacio")?.value || 0;
    neto = lleno - vacio;
  } else if (tipo === "mano") {
    neto = +document.getElementById("peso")?.value || 0;
  }

  // Materiales: hierro + extras
  const materiales = [{ material: "Hierro", peso: neto }];
  document.querySelectorAll("#listaExtras p").forEach(p => {
    materiales.push({ material: p.dataset.material, peso: parseFloat(p.dataset.peso) });
  });

  const uid = auth?.currentUser?.uid;
  if (!uid) return alert("No hay usuario logueado");

  // Precios
  const pRef = doc(db, "precios", uid);
  const pSnap = await getDoc(pRef);
  const precios = pSnap.exists() ? (pSnap.data().materiales || {}) : {};

  const materialesConTotal = materiales.map(m => ({
    ...m,
    precioUnit: precios[m.material] || 0,
    total: (precios[m.material] || 0) * m.peso
  }));
  const totalGeneral = materialesConTotal.reduce((a,b)=>a+b.total,0);

  // Configuración de factura + consecutivo
  const cfgRef = doc(db, "facturas", uid);
  const cfgSnap = await getDoc(cfgRef);
  const cfg = cfgSnap.exists() ? cfgSnap.data() : {};
  const numeroFactura = (cfg.contadorFactura || 0) + 1;
  await setDoc(cfgRef, { contadorFactura: numeroFactura }, { merge: true });

  try {
    // Guardar pesaje
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo, nombre, cedula, placa,
      materiales: materialesConTotal,
      totalGeneral,
      numeroFactura,
      fecha: serverTimestamp()
    });

    // Actualizar inventario
    await actualizarInventario(materiales);

    // Contabilidad (egreso)
    await addDoc(collection(db, "contabilidad", uid, "egresos"), {
      descripcion: `Compra de materiales (${materiales.map(m=>m.material).join(", ")})`,
      monto: totalGeneral,
      fecha: serverTimestamp()
    });

    // Factura estilo recibo
    const fecha = new Date().toLocaleDateString("es-CR", { timeZone: "America/Costa_Rica" });
    const hora  = new Date().toLocaleTimeString("es-CR", { timeZone: "America/Costa_Rica" });

    let reciboHTML = `
      <div class="recibo">
        <p><strong>${cfg.nombreLocal || "Mi Local"}</strong></p>
        <p>Hacienda: ${cfg.numHacienda || "N/A"}</p>
        <p>Tel: ${cfg.telefono1 || "-"} / ${cfg.telefono2 || "-"}</p>
        <p>Factura #${numeroFactura}</p>
        <p>Fecha: ${fecha} ${hora}</p>
        <hr>
        <p>Cliente: ${nombre || "N/A"}</p>
        <p>Cédula: ${cedula || "N/A"}</p>
        ${placa ? `<p>Placa: ${placa}</p>` : ""}
        <hr>`;

    materialesConTotal.forEach(m => {
      reciboHTML += `<p>${m.material} x ${m.peso} = ₡${m.total}</p>`;
    });

    reciboHTML += `
        <hr>
        <p><strong>Total: ₡${totalGeneral}</strong></p>
        <hr>
        <p style="text-align:center"><strong>¡Gracias por su compra!</strong></p>
        <p style="text-align:center">🐼</p>
        <p style="text-align:center"><strong>¡Gracias por elegirnos!</strong></p>
        <p style="text-align:center">^^^^^^</p>
      </div>
      <button id="btnImprimirFactura">🖨 Imprimir</button>
    `;

    document.getElementById("resultado").innerHTML = reciboHTML;

    // imprimir
    document.getElementById("btnImprimirFactura").addEventListener("click", () => {
      const ventana = window.open("", "PRINT");
      ventana.document.write("<html><head><title>Factura</title>");
      ventana.document.write("<style>body{font-family:Courier;font-size:14px}.recibo{width:300px;margin:auto}</style>");
      ventana.document.write("</head><body>");
      ventana.document.write(reciboHTML);
      ventana.document.write("</body></html>");
      ventana.document.close();
      ventana.focus();
      ventana.print();
      ventana.close();
    });

    limpiarFormulario();
  } catch (e) {
    console.error(e);
    alert("❌ Error al guardar: " + (e?.message || e));
  }
}

// ---- Inventario ----
async function actualizarInventario(materiales) {
  const uid = auth?.currentUser?.uid || "desconocido";
  const ref = doc(db, "inventarios", uid);
  const snap = await getDoc(ref);
  let datos = snap.exists() ? (snap.data().materiales || {}) : {};
  materiales.forEach(m => { datos[m.material] = (datos[m.material] || 0) + m.peso; });
  await setDoc(ref, { materiales: datos, actualizado: serverTimestamp() }, { merge: true });
}

// ---- Util ----
function limpiarFormulario() {
  ["nombre","cedula","placa","delanteraLlena","traseraLlena","delanteraVacia","traseraVacia","lleno","vacio","peso"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

  const lista = document.getElementById("listaExtras");
  if (lista) lista.innerHTML = "";

  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
