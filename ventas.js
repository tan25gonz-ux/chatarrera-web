import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);
  cargarVentas(); // ✅ Mostrar historial al entrar
});

async function registrarVenta() {
  const material = document.getElementById("materialVenta").value;
  const peso = parseFloat(document.getElementById("pesoVenta").value) || 0;
  const contenedor = document.getElementById("contenedorVenta").value;
  const resultado = document.getElementById("resultado");

  if (!material || peso <= 0 || !contenedor) {
    alert("Complete todos los campos correctamente");
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

  // Restar del inventario
  datos[material] -= peso;

  try {
    // Guardar venta
    await addDoc(collection(db, "ventas", uid, "items"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
      peso,
      contenedor,
      fecha: Timestamp.now()
    });

    // Actualizar inventario
    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });

    resultado.innerText = `✅ Contenedor Registrado: ${peso} kg de ${material} (Contenedor ${contenedor})`;

    // ✅ actualizar tabla
    cargarVentas();

    // Limpiar inputs
    document.getElementById("pesoVenta").value = "";
    document.getElementById("contenedorVenta").value = "";
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

  const tabla = document.querySelector("#tablaVentas tbody");
  tabla.innerHTML = "";

  snap.forEach(doc => {
    const v = doc.data();
    const fecha = v.fecha?.toDate().toLocaleString("es-CR") || "Sin fecha";
    tabla.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${v.material}</td>
        <td>${v.peso}</td>
        <td>${v.contenedor}</td>
      </tr>
    `;
  });
}
