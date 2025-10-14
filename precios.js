import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ Usuario autenticado:", user.uid);
      cargarPrecios(user.uid);
      document.getElementById("btnGuardarPrecios").addEventListener("click", () => guardarPrecios(user.uid));
    } else {
      alert("⚠️ Debe iniciar sesión para configurar precios.");
    }
  });
});

// 🔹 Limpieza de nombres (evita errores de mayúsculas, tildes o espacios)
function normalizarNombre(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, "").trim();
}

// 🔹 Guardar precios
async function guardarPrecios(uid) {
  const campos = document.querySelectorAll("#precios input[type='number']");
  const materiales = {};

  campos.forEach(c => {
    const nombre = c.id.replace("precio-", "");
    const valor = parseFloat(c.value) || 0;
    materiales[nombre] = valor;
  });

  try {
    await setDoc(doc(db, "precios", uid), { materiales }, { merge: true });
    alert("✅ Precios guardados correctamente.");
  } catch (e) {
    console.error(e);
    alert("❌ Error al guardar precios: " + e.message);
  }
}

// 🔹 Cargar precios guardados
async function cargarPrecios(uid) {
  try {
    const ref = doc(db, "precios", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("⚠️ No hay precios guardados todavía.");
      return;
    }

    const mats = snap.data().materiales || {};
    console.log("📦 Precios cargados desde Firestore:", mats);

    // Comparar nombres normalizados
    const inputs = document.querySelectorAll("#precios input[type='number']");
    inputs.forEach(input => {
      const id = input.id.replace("precio-", "");
      const normalizadoId = normalizarNombre(id);

      // Buscar coincidencia flexible en los materiales guardados
      const coincidencia = Object.entries(mats).find(([k]) =>
        normalizarNombre(k) === normalizadoId
      );

      if (coincidencia) {
        input.value = coincidencia[1];
      }
    });

  } catch (e) {
    console.error("❌ Error al cargar precios:", e);
    alert("❌ No se pudieron cargar los precios guardados.");
  }
}
