import { auth, db } from "./firebase.js";
import { collection, addDoc, Timestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender").addEventListener("click", registrarVenta);

  // Acordeón
  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });
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

  if (!datos[material] || datos[material] < peso) {
    resultado.innerText = `❌ No hay suficiente ${material} en inventario.`;
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

    // Registrar ingreso en contabilidad
    await addDoc(collection(db, "contabilidad", uid, "ingresos"), {
      descripcion: `Venta de ${material} (Contenedor ${contenedor})`,
      monto: total,
      fecha: Timestamp.now()
    });

    // Factura
    const fechaHora = new Date().toLocaleString("es-CR", {
      dateStyle: "short",
      timeStyle: "short"
    });

    resultado.innerHTML = `
      <div class="factura" id="factura">
        <h2>🧾 Factura de Venta</h2>
        <p><strong>Fecha:</strong> ${fechaHora}</p>
        <p><strong>Contenedor:</strong> ${contenedor}</p>
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
        <button onclick="window.print()">🖨️ Imprimir</button>
      </div>
    `;

    // Limpiar inputs
    document.getElementById("pesoVenta").value = "";
    document.getElementById("contenedor").value = "";
  } catch (e) {
    resultado.innerText = "❌ Error al guardar: " + e.message;
  }
}
