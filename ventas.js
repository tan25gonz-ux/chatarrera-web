import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);
});

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const contenedor = document.getElementById("contenedorVenta").value || "";
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0) return alert("Complete bien los datos");

  const uid = auth?.currentUser?.uid;
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);
  let datos = snap.exists() ? snap.data().materiales || {} : {};

  if (!datos[material] || datos[material] < peso) {
    resultado.innerText = `❌ No hay suficiente ${material}`;
    return;
  }
  datos[material] -= peso;

  try {
    await addDoc(collection(db, "ventas", uid), {
      usuario: auth?.currentUser?.email,
      material, peso, contenedor,
      fecha: Timestamp.now()
    });
    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });
    resultado.innerText = `✅ Venta registrada: ${peso} kg de ${material}`;
  } catch (e) {
    resultado.innerText = "❌ Error: " + e.message;
  }
}
