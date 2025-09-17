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

  const uid = auth?.currentUser?.uid || "desconocido";
  const docRef = doc(db, "inventarios", uid); // 👈 misma ruta
  const snap = await getDoc(docRef);
  let datos = {};

  if (snap.exists()) {
    datos = snap.data().materiales || {};
  }

  if (!datos[material]) {
    resultado.innerText = `⚠️ El material ${material} aún no existe en el inventario.`;
    return;
  }

  if (datos[material] < peso) {
    resultado.innerText = `❌ No hay suficiente ${material}. Disponible: ${datos[material]} kg`;
    return;
  }

  datos[material] -= peso;

  try {
    await addDoc(collection(db, "ventas"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
      peso,
      fecha: Timestamp.now()
    });

    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });

    resultado.innerText = `✅ Venta registrada: ${peso} kg de ${material}`;
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
