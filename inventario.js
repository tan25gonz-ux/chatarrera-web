import { auth, db } from "./firebase.js";
import { doc, getDoc, collection, query, getDocs, orderBy, where } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");
const tablaCompras = document.querySelector("#tablaCompras tbody");

async function cargarInventario(uid) {
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
    tabla.innerHTML += `<tr><td>${mat}</td><td>${datos[mat]}</td></tr>`;
  });
}

async function cargarCompras(uid) {
  const q = query(collection(db, "pesajes"), where("usuario", "==", auth.currentUser.email), orderBy("fecha", "desc"));
  const snap = await getDocs(q);

  tablaCompras.innerHTML = "";
  snap.forEach(doc => {
    const p = doc.data();
    const fecha = p.fecha?.toDate().toLocaleString("es-CR") || "Sin fecha";
    p.materiales.forEach(m => {
      tablaCompras.innerHTML += `
        <tr>
          <td>${fecha}</td>
          <td>${m.material}</td>
          <td>${m.peso}</td>
        </tr>`;
    });
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    cargarInventario(user.uid);
    cargarCompras(user.uid);
  } else {
    alert("⚠️ Debes iniciar sesión para ver inventario.");
    window.location.href = "index.html";
  }
});

document.getElementById("btnCerrar").addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  }).catch((e) => alert("❌ Error al cerrar sesión: " + e.message));
});
