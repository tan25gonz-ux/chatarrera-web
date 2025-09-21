import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tipo").addEventListener("change", mostrarCampos);
  document.getElementById("btnRegistrar").addEventListener("click", registrarPesaje);
  document.getElementById("btnCerrar").addEventListener("click", cerrarSesion);
});

// --- Mostrar campos según tipo ---
function mostrarCampos() {
  const tipo = document.getElementById("tipo").value;
  const campos = document.getElementById("campos");
  campos.innerHTML = "";

  if (tipo === "camionGrande" || tipo === "camionPequeno") {
    campos.innerHTML = `
      <h3>${tipo === "camionGrande" ? "Camión Grande" : "Camión Pequeño"} (Hierro)</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Placa: <input type="text" id="placa"></label>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "carreta") {
    campos.innerHTML = `
      <h3>Carreta (Hierro por defecto)</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Peso lleno (kg): <input type="number" id="lleno"></label>
      <label>Peso vacío (kg): <input type="number" id="vacio"></label>
    `;
  }

  if (tipo === "mano") {
    campos.innerHTML = `
      <h3>A Mano (Hierro por defecto)</h3>
      <label>Cédula: <input type="text" id="cedula"></label>
      <label>Peso directo (kg): <input type="number" id="peso"></label>
    `;
  }
}

// --- Registrar pesaje ---
async function registrarPesaje() {
  const tipo = document.getElementById("tipo").value;
  const resultadoDiv = document.getElementById("resultado");

  if (!tipo) {
    alert("Seleccione un tipo primero");
    return;
  }

  const cedula = document.getElementById("cedula")?.value || "";
  const placa = document.getElementById("placa")?.value || "";

  let neto = 0;

  if (tipo === "camionGrande" || tipo === "camionPequeno" || tipo === "carreta") {
    const lleno = parseFloat(document.getElementById("lleno").value) || 0;
    const vacio = parseFloat(document.getElementById("vacio").value) || 0;
    neto = lleno - vacio;
  }

  if (tipo === "mano") {
    neto = parseFloat(document.getElementById("peso").value) || 0;
  }

  const materiales = [{ material: "Hierro", peso: neto }];

  // Tomar precios de la columna derecha
  const precios = {};
  document.querySelectorAll("#precios input").forEach(input => {
    const mat = input.id.replace("precio-", "");
    precios[mat] = parseFloat(input.value) || 0;
  });

  const materialesConTotales = materiales.map(m => {
    const precioUnit = precios[m.material] || 0;
    return {
      ...m,
      precioUnit,
      total: m.peso * precioUnit
    };
  });

  const totalGeneral = materialesConTotales.reduce((acc, m) => acc + m.total, 0);

  try {
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo,
      cedula,
      placa,
      materiales: materialesConTotales,
      totalGeneral,
      fecha: Timestamp.now()
    });

    await actualizarInventario(materiales);

    const fechaHora = new Date().toLocaleString("es-CR", {
      dateStyle: "short",
      timeStyle: "short"
    });

    // Mostrar factura
    resultadoDiv.innerHTML = `
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
            ${materialesConTotales.map(m => `
              <tr>
                <td>${m.material}</td>
                <td>${m.peso}</td>
                <td>₡${m.precioUnit}</td>
                <td>₡${m.total}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <h3>Total General: ₡${totalGeneral}</h3>
        <button onclick="window.print()">🖨️ Imprimir</button>
      </div>
    `;

    limpiarFormulario();
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

// --- Limpiar formulario (solo pesaje, no precios) ---
function limpiarFormulario() {
  // Limpiar inputs del bloque de pesaje
  const camposPesaje = document.querySelectorAll("#campos input, #campos select");
  camposPesaje.forEach(input => input.value = "");

  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
}

// --- Cerrar sesión ---
function cerrarSesion() {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  }).catch((error) => {
    alert("❌ Error al cerrar sesión: " + error.message);
  });
}
