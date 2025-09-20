import { auth, db } from "./firebase.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");
const tablaVentas = document.querySelector("#tablaVentas tbody");

// Cargar inventario del usuario
async function cargarInventario() {
  const uid = auth?.currentUser?.uid || "desconocido";
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  const datos = {};
  materiales.forEach(m => datos[m] = 0);

  if (snap.exists()) {
    const data = snap.data();
    const inventario = data.materiales || {};
    materiales.forEach(m => {
      if (inventario[m] !== undefined) {
        datos[m] = inventario[m];
      }
    });
  }

  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const fila = `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
    tabla.innerHTML += fila;
  });
}

// Cargar ventas con contenedor
async function cargarVentas() {
  const q = query(
    collection(db, "ventas"),
    where("usuario", "==", auth.currentUser.email),
    orderBy("fecha", "desc")
  );
  const snap = await getDocs(q);

  tablaVentas.innerHTML = "";
  snap.forEach(doc => {
    const v = doc.data();
    const fecha = v.fecha.toDate().toLocaleString("es-CR");
    const fila = `<tr>
      <td>${fecha}</td>
      <td>${v.material}</td>
      <td>${v.peso}</td>
      <td>${v.contenedor}</td>
    </tr>`;
    tablaVentas.innerHTML += fila;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cargarInventario();
  cargarVentas();
});
