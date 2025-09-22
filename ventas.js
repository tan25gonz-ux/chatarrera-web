import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);
});

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const contenedor = document.getElementById("contenedorVenta")?.value || "";
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  const uid = auth?.currentUser?.uid || "desconocido";
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

  try {
    // Guardar venta sin total
    await addDoc(collection(db, "ventas", uid, "items"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
      peso,
      contenedor,
      fecha: Timestamp.now()
    });

    // Actualizar inventario
    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });

    resultado.innerText = `✅ Contenedor Registrado: ${peso} kg de ${material} ${contenedor ? `(Contenedor: ${contenedor})` : ""}`;
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
