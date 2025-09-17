import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnVender = document.getElementById("btnVender");
  btnVender.addEventListener("click", registrarVenta);
});

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  const normalizado = material.charAt(0).toUpperCase() + material.slice(1).toLowerCase();

  try {
    // Guardar historial de ventas
    await addDoc(collection(db, "ventas"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material: normalizado,
      peso,
      fecha: Timestamp.now()
    });

    // Descontar del inventario
    const docRef = doc(db, "inventario", "materiales");
    const snap = await getDoc(docRef);
    let datos = {};

    if (snap.exists()) {
      datos = snap.data();
    }

    if (!datos[normalizado]) datos[normalizado] = 0;
    if (datos[normalizado] < peso) {
      resultado.innerText = `❌ No hay suficiente ${normalizado} en inventario. Disponible: ${datos[normalizado]} kg`;
      return;
    }

    datos[normalizado] -= peso;

    await setDoc(docRef, { ...datos, actualizado: Timestamp.now() });

    resultado.innerText = `✅ Venta registrada: ${peso} kg de ${normalizado}`;
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
