import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");

// --- Función para cargar inventario de un usuario ---
async function cargarInventario(uid) {
  console.log("📌 UID actual:", uid);

  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  // Inicializar todos en 0
  const datos = {};
  materiales.forEach(m => datos[m] = 0);

  if (snap.exists()) {
    const data = snap.data();
    console.log("📦 Datos Firestore:", data);

    const inventario = data.materiales || {};
    materiales.forEach(m => {
      if (inventario[m] !== undefined) {
        datos[m] = inventario[m];
      }
    });
  } else {
    console.warn("⚠️ No existe inventario para este usuario, se mostrará todo en 0");
  }

  // Pintar tabla
  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const fila = `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
    tabla.innerHTML += fila;
  });
}

// --- Esperar a que Firebase sepa qué usuario está logueado ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    cargarInventario(user.uid);
  } else {
    console.warn("⚠️ No hay usuario logueado");
  }
});
