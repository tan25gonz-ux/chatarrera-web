import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, doc, setDoc, getDoc, query, getDocs, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

let compras = []; // historial para filtrar

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tipo")?.addEventListener("change", mostrarCampos);
  document.getElementById("btnRegistrar")?.addEventListener("click", registrarPesaje);
  document.getElementById("btnAgregarExtra")?.addEventListener("click", agregarMaterial);
  document.getElementById("btnCerrar")?.addEventListener("click", cerrarSesion);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarPrecios(user.uid);
      cargarCompras(user.uid);
    }
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

// ---- Registrar pesaje + Factura ----
// (mantengo igual tu lógica de factura aquí 👌)

// ---- Cargar compras + filtro ----
async function cargarCompras(uid) {
  const q = query(collection(db, "pesajes"), where("usuario", "==", auth.currentUser.email), orderBy("fecha", "desc"));
  const snap = await getDocs(q);

  compras = [];
  snap.forEach(docSnap => {
    const p = docSnap.data();
    const fecha = p.fecha?.toDate() || new Date();
    p.materiales.forEach(m => {
      compras.push({
        fecha,
        material: m.material,
        peso: m.peso
      });
    });
  });

  mostrarCompras();
}

window.mostrarCompras = function() {
  const tbody = document.querySelector("#tablaCompras tbody");
  tbody.innerHTML = "";
  if (!compras.length) {
    tbody.innerHTML = "<tr><td colspan='3'>Sin registros</td></tr>";
    return;
  }
  compras.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.fecha.toLocaleString("es-CR")}</td>
        <td>${c.material}</td>
        <td>${c.peso}</td>
      </tr>`;
  });
};

window.filtrarCompras = function() {
  const inicio = document.getElementById("fechaInicio").value;
  const fin = document.getElementById("fechaFin").value;
  if (!inicio || !fin) {
    alert("Seleccione ambas fechas");
    return;
  }
  const inicioDate = new Date(inicio + "T00:00:00");
  const finDate = new Date(fin + "T23:59:59");

  const filtradas = compras.filter(c => c.fecha >= inicioDate && c.fecha <= finDate);

  const tbody = document.querySelector("#tablaCompras tbody");
  tbody.innerHTML = "";
  if (!filtradas.length) {
    tbody.innerHTML = "<tr><td colspan='3'>Sin registros</td></tr>";
    return;
  }
  filtradas.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.fecha.toLocaleString("es-CR")}</td>
        <td>${c.material}</td>
        <td>${c.peso}</td>
      </tr>`;
  });
};

// ---- Logout ----
function cerrarSesion() {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  }).catch((e) => alert("❌ Error al cerrar sesión: " + e.message));
}
