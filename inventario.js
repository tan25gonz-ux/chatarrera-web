import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");

async function cargarInventario() {
  const uid = auth?.currentUser?.uid || "global"; // puede ser por usuario o global
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  // inicializar inventario en 0
  const datos = {};
  materiales.forEach(m => datos[m] = 0);

  if (snap.exists()) {
    const data = snap.data().materiales || {};
    materiales.forEach(m => {
      if (data[m] !== undefined) datos[m] = data[m];
    });
  }

  // pintar tabla
  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const fila = `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
    tabla.innerHTML += fila;
  });
}

document.addEventListener("DOMContentLoaded", cargarInventario);
