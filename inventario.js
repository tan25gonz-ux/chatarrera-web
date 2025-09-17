import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");

function renderInventario(datos) {
  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const fila = `<tr><td>${mat}</td><td>${datos[mat] || 0}</td></tr>`;
    tabla.innerHTML += fila;
  });
}

async function cargarInventario(uid) {
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  const datos = {};
  materiales.forEach(m => (datos[m] = 0));

  if (snap.exists()) {
    const data = snap.data().materiales || {};
    materiales.forEach(m => {
      if (data[m] !== undefined) datos[m] = data[m];
    });
  }

  renderInventario(datos);
}

// Escuchar el login del usuario
onAuthStateChanged(auth, (user) => {
  if (user) {
    cargarInventario(user.uid);
  } else {
    alert("Debes iniciar sesión para ver el inventario");
    window.location.href = "index.html";
  }
});
