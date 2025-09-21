import { auth, db } from "./firebase.js";
import { doc, getDoc, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const materiales = [
  "Hierro","Aluminio","Cobre","Bronce","Batería","Acero","Cable","Catalizador","Plástico de lavadora","Plástico de caja","Carrocería"
];

async function cargarInventario(uid) {
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);
  const datos = {};
  materiales.forEach(m => datos[m] = 0);
  if (snap.exists()) {
    const inv = snap.data().materiales || {};
    materiales.forEach(m => { if (inv[m] !== undefined) datos[m] = inv[m]; });
  }
  const tabla = document.querySelector("#tablaInventario tbody");
  tabla.innerHTML = materiales.map(m => `<tr><td>${m}</td><td>${datos[m]}</td></tr>`).join("");
}

async function cargarVentas(uid) {
  const ventasRef = collection(db, "ventas", uid);
  const q = query(ventasRef, orderBy("fecha","desc"));
  const snap = await getDocs(q);
  const tabla = document.querySelector("#tablaVentas tbody");
  tabla.innerHTML = "";
  snap.forEach(d => {
    const v = d.data();
    const fecha = v.fecha?.toDate().toLocaleString("es-CR");
    tabla.innerHTML += `<tr><td>${fecha}</td><td>${v.material}</td><td>${v.peso}</td><td>${v.contenedor||"N/A"}</td></tr>`;
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    cargarInventario(user.uid);
    cargarVentas(user.uid);
  } else {
    alert("⚠️ Debe iniciar sesión");
    window.location.href = "index.html";
  }
});

document.getElementById("btnCerrar").addEventListener("click", () => {
  signOut(auth).then(() => { window.location.href="index.html"; });
});
