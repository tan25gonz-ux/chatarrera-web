import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tipo").addEventListener("change", mostrarCampos);
  document.getElementById("btnRegistrar").addEventListener("click", registrarPesaje);
  document.getElementById("btnAgregarExtra").addEventListener("click", agregarMaterial);
  document.getElementById("btnCerrar").addEventListener("click", cerrarSesion);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarPrecios(user.uid);
    }
  });
});

// --- Mostrar campos según tipo ---
function mostrarCampos() {
  const tipo = document.getElementById("tipo").value;
  const campos = document.getElementById("campos");
  campos.innerHTML = "";

  if (tipo === "camionGrande") {
    campos.innerHTML = `
      <h3>Camión Grande (Hierro)</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Placa: <input type="text" id="placa"></label>
      <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
      <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
      <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
      <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
    `;
  }

  if (tipo === "camionPequeno") {
    campos.innerHTML = `
      <h3>Camión Pequeño (Hierro)</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Placa: <input type="text" id="placa"></label>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "carreta") {
    campos.innerHTML = `
      <h3>Carreta</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "mano") {
    campos.innerHTML = `
      <h3>A Mano</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Peso directo (kg): <input type="number" id="peso"></label>
    `;
  }
}

// --- Agregar material extra ---
function agregarMaterial() {
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
}

// --- Cargar precios (modo lectura) ---
async function cargarPrecios(uid) {
  const docRef = doc(db, "precios", uid);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data().materiales;
    const div = document.getElementById("preciosUsuario");
    div.innerHTML = Object.entries(data).map(([mat, val]) =>
      `<p><strong>${mat}:</strong> ₡${val}</p>`
    ).join("");
  } else {
    document.getElementById("preciosUsuario").innerText = "❌ No hay precios configurados.";
  }
}

// --- Registrar pesaje ---
async function registrarPesaje() {
  const tipo = document.getElementById("tipo").value;
  if (!tipo) {
    alert("Seleccione un tipo de transporte");
    return;
  }

  const cedula = document.getElementById("cedula")?.value || "";
  const placa = document.getElementById("placa")?.value || "";

  let neto = 0;

  if (tipo === "camionGrande") {
    const dl = parseFloat(document.getElementById("delanteraLlena").value) || 0;
    const tl = parseFloat(document.getElementById("traseraLlena").value) || 0;
    const dv = parseFloat(document.getElementById("delanteraVacia").value) || 0;
    const tv = parseFloat(document.getElementById("traseraVacia").value) || 0;
    neto = (dl + tl) - (dv + tv);
  }

  if (tipo === "camionPequeno" || tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("peso").value) || 0;
  }

  // Materiales: hierro por defecto + extras
  const materiales = [{ material: "Hierro", peso: neto }];
  document.querySelectorAll("#listaExtras p").forEach(p => {
    materiales.push({ material: p.dataset.material, peso: parseFloat(p.dataset.peso) });
  });

  // Precios desde Firebase
  const uid = auth?.currentUser?.uid;
  const docRef = doc(db, "precios", uid);
  const snap = await getDoc(docRef);
  const precios = snap.exists() ? snap.data().materiales : {};

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
      cedula,
      placa,
      materiales: materialesConTotal,
      totalGeneral,
      fecha: Timestamp.now()
    });

    await actualizarInventario(materiales);

    await addDoc(collection(db, "contabilidad", uid, "egresos"), {
      descripcion: `Compra de materiales (${materiales.map(m => m.material).join(", ")})`,
      monto: totalGeneral,
      fecha: Timestamp.now()
    });

    // ✅ Mostrar fecha/hora en Costa Rica
    const fechaHora = new Date().toLocaleString("es-CR", {
      timeZone: "America/Costa_Rica",
      dateStyle: "short",
      timeStyle: "short"
    });

    document.getElementById("resultado").innerHTML = `
      <div class="factura">
        <h2>🧾 Factura de Compra</h2>
        <p><strong>Fecha:</strong> ${fechaHora}</p>
        <p><strong>Cédula:</strong> ${cedula || "N/A"}</p>
        ${placa ? `<p><strong>Placa:</strong> ${placa}</p>` : ""}
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Peso (kg)</th>
              <th>Precio ₡/kg</th>
              <th>Total ₡</th>
            </tr>
          </thead>
          <tbody>
            ${materialesConTotal.map(m =>
              `<tr>
                <td>${m.material}</td>
                <td>${m.peso}</td>
                <td>₡${m.precioUnit}</td>
                <td>₡${m.total}</td>
              </tr>`
            ).join("")}
          </tbody>
        </table>
        <h3>Total General: ₡${totalGeneral}</h3>
        <button onclick="window.print()">🖨 Imprimir</button>
      </div>
    `;
  } catch (e) {
    document.getElementById("resultado").innerText = "❌ Error al guardar: " + e.message;
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

// --- Cerrar sesión ---
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
