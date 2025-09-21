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
    alert("Por favor ingrese datos válidos.");
    return;
  }

  try {
    const precios = obtenerPrecios();
    const total = peso * (precios[material] || 0);

    await addDoc(collection(db, "ventas"), {
      material,
      peso,
      contenedor,
      total,
      fecha: Timestamp.now()
    });

    resultado.textContent = `✅ Venta registrada: ${peso} kg de ${material} por ₡${total}`;
    document.getElementById("pesoVenta").value = "";
    document.getElementById("contenedor").value = "";

    cargarVentas();
  } catch (error) {
    console.error("Error al registrar venta:", error);
  }
}

async function cargarVentas() {
  const tabla = document.querySelector("#tablaVentas tbody");
  tabla.innerHTML = "";

  const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${data.material}</td>
      <td>${data.peso}</td>
      <td>${data.contenedor || "-"}</td>
      <td>${data.fecha.toDate().toLocaleString()}</td>
    `;
    tabla.appendChild(fila);
  });
}
