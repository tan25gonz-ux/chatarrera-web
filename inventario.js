import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");

async function cargarInventario() {
  const docRef = doc(db, "inventario", "materiales");
  const snap = await getDoc(docRef);

  const datos = {};
  materiales.forEach(m => datos[m] = 0);

  if (snap.exists()) {
    const data = snap.data();
    materiales.forEach(m => {
      const normalizado = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
      if (data[normalizado] !== undefined) datos[m] = data[normalizado];
    });
  }

  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const fila = `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
    tabla.innerHTML += fila;
  });
}

document.addEventListener("DOMContentLoaded", cargarInventario);
