import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Lista de materiales
const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const acordeon = document.getElementById("acordeon");
const tablaVentas = document.querySelector("#tablaVentas tbody");

let uidUsuario = null;

// Crear acordeón dinámicamente
function crearAcordeon() {
  materiales.forEach(material => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = material;

    const form = document.createElement("form");
    form.innerHTML = `
      <input type="text" name="contenedor" placeholder="Número de Contenedor" required>
      <input type="number" name="kilos" placeholder="Cantidad de Kilos" required min="1">
      <button type="submit">➕ Registrar</button>
    `;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const contenedor = form.contenedor.value.trim();
      const kilos = parseFloat(form.kilos.value);

      if (!contenedor || isNaN(kilos) || kilos <= 0) {
        alert("Por favor ingrese datos válidos.");
        return;
      }

      await registrarVenta(material, contenedor, kilos);
      form.reset();
    });

    details.appendChild(summary);
    details.appendChild(form);
    acordeon.appendChild(details);
  });
}

// Registrar venta y actualizar inventario
async function registrarVenta(material, contenedor, kilos) {
  try {
    const inventarioRef = doc(db, "inventarios", uidUsuario);
    const snap = await getDoc(inventarioRef);

    let datosInventario = {};
    if (snap.exists()) {
      datosInventario = snap.data();
    }

    // Verificar stock disponible
    if (!datosInventario[material] || datosInventario[material] < kilos) {
      alert(`No hay suficiente ${material} en inventario.`);
      return;
    }

    // Restar kilos del inventario
    datosInventario[material] -= kilos;
    await updateDoc(inventarioRef, datosInventario);

    // Registrar en colección "ventas"
    await addDoc(collection(db, "ventas"), {
      uid: uidUsuario,
      material,
      contenedor,
      kilos,
      fecha: Timestamp.now()
    });

    // Mostrar en tabla
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${contenedor}</td>
      <td>${material}</td>
      <td>${kilos}</td>
    `;
    tablaVentas.appendChild(fila);

  } catch (error) {
    console.error("Error registrando venta:", error);
  }
}

// Detectar usuario autenticado
onAuthStateChanged(auth, (user) => {
  if (user) {
    uidUsuario = user.uid;
    crearAcordeon();
  } else {
    alert("Debes iniciar sesión.");
    window.location.href = "login.html";
  }
});
