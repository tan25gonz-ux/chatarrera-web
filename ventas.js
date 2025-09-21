import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnVender = document.getElementById("btnVender");
  btnVender.addEventListener("click", registrarVenta);
});

function obtenerPrecios() {
  const precios = {};
  document.querySelectorAll("#preciosVenta input").forEach(input => {
    const mat = input.id.replace("precio-", "");
    precios[mat] = parseFloat(input.value) || 0;
  });
  return precios;
}

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const contenedor = document.getElementById("contenedor").value || "N/A";
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  const precios = obtenerPrecios();
  const precioUnit = precios[material] || 0;
  const total = peso * precioUnit;

  const uid = auth?.currentUser?.uid || "desconocido";
  const docRef = doc(db, "inventarios", uid);
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
    await addDoc(collection(db, "ventas", uid, "items"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
      peso,
      contenedor,
      total,
      fecha: Timestamp.now()
    });

    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });

    // 👉 Guardar venta como ingreso en contabilidad
    await addDoc(collection(db, "contabilidad", auth.currentUser.uid, "ingresos"), {
      descripcion: `Venta de ${material} (Contenedor ${contenedor})`,
      monto: total,
      fecha: Timestamp.now()
    });

    resultado.innerText = `✅ Venta registrada: ${peso} kg de ${material} (₡${total})`;
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
