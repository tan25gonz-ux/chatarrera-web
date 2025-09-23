import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// ---------------- VARIABLES ----------------
let materialesExtras = [];

// ---------------- AGREGAR MATERIAL EXTRA ----------------
document.getElementById("btnAgregarExtra")?.addEventListener("click", () => {
  const mat = document.getElementById("materialSelect")?.value;
  const peso = parseFloat(document.getElementById("pesoMaterial")?.value);

  if (!mat || isNaN(peso) || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  materialesExtras.push({ material: mat, peso });

  // Mostrar en lista
  const lista = document.getElementById("listaExtras");
  const p = document.createElement("p");
  p.textContent = `${mat} — ${peso} kg`;
  p.dataset.material = mat;
  p.dataset.peso = peso;
  lista.appendChild(p);

  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
});

// ---------------- REGISTRAR PESAJE ----------------
async function registrarPesaje() {
  const tipo = document.getElementById("tipo")?.value;
  if (!tipo) return alert("Seleccione un tipo de transporte");

  const nombre = document.getElementById("nombre")?.value || "";
  const cedula = document.getElementById("cedula")?.value || "";
  const placa = document.getElementById("placa")?.value || "";
  const usuario = auth.currentUser?.email;

  if (!usuario) {
    alert("Debes iniciar sesión");
    return;
  }

  // 🚀 Guardar en Firebase
  try {
    await addDoc(collection(db, "pesajes"), {
      usuario,
      nombre,
      cedula,
      placa,
      tipo,
      materiales: materialesExtras,
      fecha: serverTimestamp()
    });

    // Mostrar factura en pantalla
    const resultado = document.getElementById("resultado");
    resultado.innerHTML = `
      <div class="factura">
        <h2>Factura</h2>
        <p>Cliente: ${nombre}</p>
        <p>Cédula: ${cedula}</p>
        <p>Placa: ${placa}</p>
        <p>Fecha: ${new Date().toLocaleString("es-CR")}</p>
        <h3>Materiales:</h3>
        <ul>
          ${materialesExtras
            .map((m) => `<li>${m.material}: ${m.peso} kg</li>`)
            .join("")}
        </ul>
        <p>¡Gracias por su compra!</p>
      </div>
      <button id="btnImprimirFactura">🖨 Imprimir</button>
    `;

    // Botón imprimir factura
    document
      .getElementById("btnImprimirFactura")
      .addEventListener("click", () => {
        const factura = document.querySelector(".factura").outerHTML;
        const ventana = window.open("", "", "width=400,height=600");
        ventana.document.write(`
          <html><head><title>Factura</title></head><body>
          ${factura}
          </body></html>
        `);
        ventana.document.close();
        ventana.print();
      });

    // limpiar lista de extras
    materialesExtras = [];
    document.getElementById("listaExtras").innerHTML = "";
  } catch (e) {
    console.error("Error guardando pesaje:", e);
    alert("❌ Error guardando pesaje");
  }
}

document.getElementById("btnRegistrar")?.addEventListener("click", registrarPesaje);

// ---------------- LOGIN & LOGOUT ----------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("⚠️ Debes iniciar sesión para continuar.");
    window.location.href = "index.html";
  }
});

document.getElementById("btnCerrar")?.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      sessionStorage.clear();
      window.location.href = "index.html";
    })
    .catch((e) => alert("❌ Error al cerrar sesión: " + e.message));
});
