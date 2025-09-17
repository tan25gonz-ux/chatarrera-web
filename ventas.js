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

  try {
    // Guardar venta en historial
    await addDoc(collection(db, "ventas"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
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

    if (!datos[material]) datos[material] = 0;
    if (datos[material] < peso) {
      resultado.innerText = `❌ No hay suficiente ${material} en inventario. Disponible: ${datos[material]} kg`;
      return;
    }

    datos[material] -= peso;

    await setDoc(docRef, { ...datos, actualizado: Timestamp.now() });

    resultado.innerText = `✅ Venta registrada: ${peso} kg de ${material}`;
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
