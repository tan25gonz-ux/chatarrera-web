import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);
  cargarVentas();
});

function obtenerPrecios() {
  return {
    "Hierro": 200,
    "Aluminio": 500,
    "Cobre": 2000,
    "Bronce": 1500,
    "Batería": 300,
    "Acero": 250,
    "Cable": 1000,
    "Catalizador": 4000,
    "Plástico de lavadora": 50,
    "Plástico de caja": 30,
    "Carrocería": 100
  };
}

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const contenedor = document.getElementById("contenedor").value.trim();
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  const uid = auth?.currentUser?.uid;
  if (!uid) {
    alert("⚠️ Debes iniciar sesión.");
    return;
  }

  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);
  let datos = {};

  if (snap.exists()) {
    datos = snap.data().materiales || {};
  }

  if (!datos[material] || datos[material] < peso) {
    resultado.innerText = `❌ No hay suficiente ${material}. Disponible: ${datos[material] || 0} kg`;
    return;
  }

  datos[material] -= peso;

  const precios = obtenerPrecios();
  const precioUnit = precios[material] || 0;
  const total = peso * precioUnit;

  try {
    await addDoc(collection(db, "ventas", uid, "items"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
      peso,
      contenedor,
      precioUnit,
      total,
      fecha: Timestamp.now()
    });

    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });

    resultado.innerHTML = `
      ✅ Venta registrada:<br>
      ${peso} kg de ${material} = <strong>₡${total}</strong>
    `;

    cargarVentas();
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}

async function cargarVentas() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return;

  const ventasRef = collection(db, "ventas", uid, "items");
  const q = query(ventasRef, orderBy("fecha", "desc"));
  const snap = await getDocs(q);

  const tablaVentas = document.querySelector("#tablaVentas tbody");
  tablaVentas.innerHTML = "";

  snap.forEach(doc => {
    const v = doc.data();
    const fecha = v.fecha?.toDate().toLocaleString("es-CR") || "Sin fecha";
    tablaVentas.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${v.material}</td>
        <td>${v.peso}</td>
        <td>${v.contenedor || "N/A"}</td>
        <td>₡${v.total}</td>
      </tr>`;
  });
}
