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

  if (!tipo) {
    alert("Seleccione un tipo primero");
    return;
  }

  const cedula = document.getElementById("cedula")?.value || "";
  const placa = document.getElementById("placa")?.value || "";

  let neto = 0;

  if (tipo === "camionGrande" || tipo === "camionPequeno") {
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
      cedula,
      placa,
      materiales: materialesConTotal,
      totalGeneral,
      fecha: Timestamp.now()
    });

    await actualizarInventario(materiales);

    // --- Abrir factura en nueva ventana ---
    const fechaHora = new Date().toLocaleString("es-CR", {
      dateStyle: "short",
      timeStyle: "short"
    });

    const facturaHTML = `
      <html>
      <head>
        <title>Factura</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 15px; }
          p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          table, th, td { border: 1px solid #ccc; }
          th, td { padding: 8px; text-align: center; }
          h3 { text-align: right; margin-top: 15px; }
        </style>
      </head>
      <body>
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
        <script>window.print();</script>
      </body>
      </html>
    `;

    const nuevaVentana = window.open("", "_blank");
    nuevaVentana.document.write(facturaHTML);
    nuevaVentana.document.close();
  } catch (e) {
    alert("❌ Error al guardar: " + e.message);
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
  document.getElementById("tipo").value = "";
  document.getElementById("campos").innerHTML = "";
  document.getElementById("listaExtras").innerHTML = "";
}

// --- Cerrar sesión ---
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
