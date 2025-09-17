import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
@@ -9,34 +10,37 @@ const materiales = [

const tabla = document.querySelector("#tablaInventario tbody");

async function cargarInventario() {
  const uid = auth?.currentUser?.uid;  
  if (!uid) {
    alert("Debes iniciar sesión para ver el inventario");
    return;
  }
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
  materiales.forEach(m => datos[m] = 0);
  materiales.forEach(m => (datos[m] = 0));

  if (snap.exists()) {
    const data = snap.data();
    const materialesData = data.materiales || {};
    const data = snap.data().materiales || {};
    materiales.forEach(m => {
      if (materialesData[m] !== undefined) {
        datos[m] = materialesData[m];
      }
      if (data[m] !== undefined) datos[m] = data[m];
    });
  }

  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const fila = `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
    tabla.innerHTML += fila;
  });
  renderInventario(datos);
}

document.addEventListener("DOMContentLoaded", cargarInventario);
// Escuchar el login del usuario
onAuthStateChanged(auth, (user) => {
  if (user) {
    cargarInventario(user.uid);
  } else {
    alert("Debes iniciar sesión para ver el inventario");
    window.location.href = "index.html";
  }
});
