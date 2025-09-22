import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const tablaVentas = document.querySelector("#tablaVentas tbody");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarVentas(user.uid);
    }
  });
});

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const contenedor = document.getElementById("numContenedor").value.trim();
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0 || !contenedor) {
    alert("Complete todos los campos correctamente");
    return;
  }

  try {
    await addDoc(collection(db, "ventas", auth.currentUser.uid, "items"), {
      usuario: auth.currentUser.email,
      material,
      peso,
      contenedor,
      fecha: Timestamp.now()
    });

    resultado.innerText = `✅ Contenedor Registrado: ${peso} kg de ${material}`;

    // Limpiar campos después de registrar
    document.getElementById("pesoVenta").value = "";
    document.getElementById("numContenedor").value = "";

    cargarVentas(auth.currentUser.uid);
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}

async function cargarVentas(uid) {
  const q = query(collection(db, "ventas", uid, "items"), orderBy("fecha", "desc"));
  const snap = await getDocs(q);

  tablaVentas.innerHTML = "";
  snap.forEach(doc => {
    const v = doc.data();
    const fecha = v.fecha?.toDate().toLocaleString("es-CR") || "Sin fecha";
    tablaVentas.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${v.material}</td>
        <td>${v.peso}</td>
        <td>${v.contenedor}</td>
      </tr>`;
  });
}
