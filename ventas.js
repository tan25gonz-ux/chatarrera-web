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

  // Normalizar nombre (ej. "cobre" -> "Cobre")
  const normalizado = material.charAt(0).toUpperCase() + material.slice(1).toLowerCase();

  try {
    // Guardar historial de ventas
    await addDoc(collection(db, "ventas"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material: normalizado,
      peso,
      fecha: Timestamp.now()
    });

    // Leer inventario actual
    const docRef = doc(db, "inventario", "materiales");
    const snap = await getDoc(docRef);
    let datos = {};

    if (snap.exists()) {
      datos = snap.data();
    }

    console.log("📦 Inventario actual desde Firestore:", datos);

    if (datos[normalizado] === undefined) {
      resultado.innerText = `⚠️ El material ${normalizado} aún no existe en el inventario.`;
      return;
    }

    if (datos[normalizado] < peso) {
      resultado.innerText = `❌ No hay suficiente ${normalizado} en inventario. Disponible: ${datos[normalizado]} kg`;
      return;
    }

    // Descontar del inventario
    datos[normalizado] -= peso;

    await setDoc(docRef, { ...datos, actualizado: Timestamp.now() });

    resultado.innerText = `✅ Venta registrada: ${peso} kg de ${normalizado}`;
    console.log(`✅ Se descontaron ${peso} kg de ${normalizado}, inventario actualizado:`, datos);

  } catch (e) {
    console.error("Error en venta:", e);
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
