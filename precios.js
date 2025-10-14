import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnGuardarPrecios")?.addEventListener("click", guardarPrecios);
  cargarPrecios();
});

// ---- Normalizador (para evitar errores de nombres) ----
function normalizarNombre(nombre) {
  return nombre.replace(/\s+/g, " ").trim();
}

// ---- Guardar precios ----
async function guardarPrecios() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return alert("⚠️ Debe iniciar sesión.");

  const campos = document.querySelectorAll("#precios input[type='number']");
  const materiales = {};

  campos.forEach(c => {
    const nombre = c.id.replace("precio-", "");
    const normalizado = normalizarNombre(nombre);
    const valor = parseFloat(c.value) || 0;
    materiales[normalizado] = valor;
  });

  try {
    await setDoc(doc(db, "precios", uid), { materiales }, { merge: true });
    alert("✅ Precios guardados correctamente.");
  } catch (e) {
    console.error(e);
    alert("❌ Error al guardar precios.");
  }
}

// ---- Cargar precios existentes ----
async function cargarPrecios() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return;

  try {
    const ref = doc(db, "precios", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const mats = snap.data().materiales || {};
    for (const [k, v] of Object.entries(mats)) {
      const id = "precio-" + k;
      const input = document.getElementById(id);
      if (input) input.value = v;
    }
  } catch (e) {
    console.error(e);
  }
}
