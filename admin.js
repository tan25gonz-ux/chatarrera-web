import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

async function verPesajes() {
  const querySnapshot = await getDocs(collection(db, "pesajes"));
  let tabla = document.getElementById("tablaPesajes");
  tabla.innerHTML = "";
  querySnapshot.forEach((doc) => {
    const p = doc.data();
    tabla.innerHTML += `
      <tr>
        <td>${p.fecha.toDate().toLocaleString()}</td>
        <td>${p.usuario}</td>
        <td>${p.tipo}</td>
        <td>${p.material}</td>
        <td>${p.pesoNeto}</td>
      </tr>`;
  });
}
window.onload = verPesajes;

window.cerrarSesion = function () {
  sessionStorage.clear();
  window.location.href = "index.html";
};