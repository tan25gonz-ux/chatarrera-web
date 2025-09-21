import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc } 
  from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);

  // Acordeón precios
  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });
});

// --- Obtener precios desde inputs ---
function obtenerPrecios() {
  const precios = {};
  document.querySelectorAll("#preciosVenta input").forEach(input => {
    const mat = input.id.replace("precio-", "");
    precios[mat] = parseFloat(input.value) || 0;
  });
  return precios;
}

// --- Registrar venta ---
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
    // ✅ Guardar venta en subcolección "items" del usuario
    await addDoc(collection(db, "ventas", uid, "items"), {
      usuario: auth?.currentUser?.email || "desconocido",
      material,
      peso,
      contenedor,
      precioUnit,
      total,
      fecha: Timestamp.now()
    });

    // ✅ Actualizar inventario
    await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });

    // ✅ Mostrar comprobante
    const fechaHora = new Date().toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" });
    resultado.innerHTML = `
      <div class="factura">
        <h2>🧾 Comprobante de Venta</h2>
        <p><strong>Fecha:</strong> ${fechaHora}</p>
        <p><strong>Contenedor:</strong> ${contenedor || "N/A"}</p>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Peso (kg)</th>
              <th>Precio ₡/kg</th>
              <th>Total ₡</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${material}</td>
              <td>${peso}</td>
              <td>₡${precioUnit}</td>
              <td>₡${total}</td>
            </tr>
          </tbody>
        </table>
        <h3>Total General: ₡${total}</h3>
        <button onclick="window.print()">🖨 Imprimir</button>
      </div>
    `;
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
