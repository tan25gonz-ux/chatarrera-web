// usuario.js
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería",
  "RCB", "RCA", "RA", "TARJETA mala", "TARJETA buena"
];

const camposDiv = document.getElementById("campos");
const listaExtras = document.getElementById("listaExtras");
const btnAgregarExtra = document.getElementById("btnAgregarExtra");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnCerrar = document.getElementById("btnCerrar");
const resultadoDiv = document.getElementById("resultado");

let extras = [];
let usuarioActivo = null;

// ------------------- Sesión -------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActivo = user;
    console.log("✅ Sesión iniciada:", user.email);
  } else {
    alert("⚠️ Debes iniciar sesión.");
    window.location.href = "index.html";
  }
});

btnCerrar.addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });
});

// ------------------- Agregar material extra -------------------
btnAgregarExtra.addEventListener("click", () => {
  const mat = document.getElementById("materialSelect").value;
  const peso = parseFloat(document.getElementById("pesoMaterial").value);

  if (!mat || isNaN(peso) || peso <= 0) {
    alert("⚠️ Seleccione material y peso válido");
    return;
  }

  extras.push({ material: mat, peso });

  renderExtras();
  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
});

function renderExtras() {
  listaExtras.innerHTML = "";
  extras.forEach((ex, i) => {
    const div = document.createElement("div");
    div.textContent = `${ex.material} - ${ex.peso} kg`;
    const btn = document.createElement("button");
    btn.textContent = "❌";
    btn.onclick = () => {
      extras.splice(i, 1);
      renderExtras();
    };
    div.appendChild(btn);
    listaExtras.appendChild(div);
  });
}

// ------------------- Registrar pesaje -------------------
btnRegistrar.addEventListener("click", async () => {
  if (!usuarioActivo) return;

  if (extras.length === 0) {
    alert("⚠️ Debes agregar al menos un material");
    return;
  }

  const uid = usuarioActivo.uid;

  try {
    // 1️⃣ Actualizar inventario acumulado
    const invRef = doc(db, "inventarios", uid);
    const snap = await getDoc(invRef);
    let inventario = {};
    if (snap.exists()) inventario = snap.data().materiales || {};

    extras.forEach(ex => {
      inventario[ex.material] = (inventario[ex.material] || 0) + ex.peso;
    });

    await setDoc(invRef, { materiales: inventario }, { merge: true });

    // 2️⃣ Guardar en historial
    for (const ex of extras) {
      await addDoc(collection(db, "inventario_historial"), {
        usuario: uid,
        material: ex.material,
        cantidad: ex.peso,
        fecha: serverTimestamp()
      });
    }

    // 3️⃣ Mostrar factura en pantalla
    mostrarFactura(extras);

    // 4️⃣ Limpiar extras
    extras = [];
    renderExtras();

    alert("✅ Pesaje registrado correctamente");
  } catch (e) {
    console.error("❌ Error registrando pesaje:", e);
    alert("Error al registrar pesaje");
  }
});

// ------------------- Factura visual -------------------
function mostrarFactura(lista) {
  const fecha = new Date().toLocaleString("es-CR");
  let html = `
    <div class="factura">
      <h2>♻️ Chatarrera</h2>
      <p>Fecha: ${fecha}</p>
      <table>
        <tr><th>Material</th><th>Peso (kg)</th></tr>
  `;

  lista.forEach(m => {
    html += `<tr><td>${m.material}</td><td>${m.peso}</td></tr>`;
  });

  html += `
      </table>
      <div class="footer">¡Gracias por reciclar! 🌍</div>
    </div>
  `;

  resultadoDiv.innerHTML = html;
}
