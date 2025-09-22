import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tipo").addEventListener("change", mostrarCampos);
  document.getElementById("btnRegistrar").addEventListener("click", registrarPesaje);
  document.getElementById("btnAgregarExtra").addEventListener("click", agregarMaterial);
  document.getElementById("btnCerrar").addEventListener("click", cerrarSesion);
  document.getElementById("btnGuardarPrecios").addEventListener("click", guardarPrecios);

  // ✅ Esperar a que Firebase confirme usuario
  onAuthStateChanged(auth, (user) => {
    if (user) {
      cargarPrecios(user.uid); // cargamos precios de ese usuario
      cargarPrecios(user.uid); // cargar precios en modo lectura
    } else {
      console.warn("⚠ No hay usuario logueado");
    }
  });

  // Acordeón precios
  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });
});

// --- Mostrar campos según tipo ---
@@ -101,56 +92,19 @@
  document.getElementById("pesoMaterial").value = "";
}

// --- Obtener precios desde inputs ---
function obtenerPrecios() {
  const precios = {};
  document.querySelectorAll("#precios input").forEach(input => {
    const mat = input.id.replace("precio-", "");
    precios[mat] = parseFloat(input.value) || 0;
  });
  return precios;
}

// --- Guardar precios en Firestore ---
async function guardarPrecios() {
  const uid = auth?.currentUser?.uid;
  if (!uid) {
    alert("No hay usuario logueado");
    return;
  }

  const precios = obtenerPrecios();
  try {
    await setDoc(doc(db, "precios", uid), {
      materiales: precios,
      actualizado: Timestamp.now()
    });
    alert("✅ Precios guardados correctamente");
  } catch (e) {
    alert("❌ Error al guardar precios: " + e.message);
  }
}

// --- Cargar precios del usuario (o crear si no existen) ---
// --- Cargar precios (modo lectura) ---
async function cargarPrecios(uid) {
  const docRef = doc(db, "precios", uid);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    // ✅ Si ya existen, los cargamos
    const data = snap.data().materiales;
    for (const mat in data) {
      const input = document.getElementById("precio-" + mat);
      if (input) input.value = data[mat];
    }
    const div = document.getElementById("preciosUsuario");
    div.innerHTML = Object.entries(data).map(([mat, val]) =>
      `<p><strong>${mat}:</strong> ₡${val}</p>`
    ).join("");
  } else {
    // ❌ No existe -> lo creamos en Firebase con 0
    const precios = obtenerPrecios();
    await setDoc(docRef, {
      materiales: precios,
      actualizado: Timestamp.now()
    });
    console.log("✅ Precios iniciales creados en Firebase para este usuario");
    document.getElementById("preciosUsuario").innerText = "❌ No hay precios configurados.";
  }
}

@@ -191,7 +145,12 @@
    materiales.push({ material: p.dataset.material, peso: parseFloat(p.dataset.peso) });
  });

  const precios = obtenerPrecios();
  // ❌ Los precios ya no se leen del HTML, sino de Firebase
  const uid = auth?.currentUser?.uid;
  const docRef = doc(db, "precios", uid);
  const snap = await getDoc(docRef);
  const precios = snap.exists() ? snap.data().materiales : {};

  const materialesConTotal = materiales.map(m => {
    const precioUnit = precios[m.material] || 0;
    const total = m.peso * precioUnit;
@@ -201,7 +160,6 @@
  const totalGeneral = materialesConTotal.reduce((acc, m) => acc + m.total, 0);

  try {
    // Guardar en pesajes
    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo,
@@ -214,72 +172,70 @@

    await actualizarInventario(materiales);

    // Registrar como EGRESO en contabilidad
    const uid = auth?.currentUser?.uid || "desconocido";
    await addDoc(collection(db, "contabilidad", uid, "egresos"), {
      descripcion: `Compra de materiales (${materiales.map(m => m.material).join(", ")})`,
      monto: totalGeneral,
      fecha: Timestamp.now()
    });

    // Factura
    const fechaHora = new Date().toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" });
    document.getElementById("resultado").innerHTML = `
      <div class="factura">
        <h2>🧾 Factura de Compra</h2>
        <p><strong>Fecha:</strong> ${fechaHora}</p>
        <p><strong>Cédula:</strong> ${cedula || "N/A"}</p>
        ${placa ? `<p><strong>Placa:</strong> ${placa}</p>` : ""}
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
            ${materialesConTotal.map(m =>
              `<tr>
                <td>${m.material}</td>
                <td>${m.peso}</td>
                <td>₡${m.precioUnit}</td>
                <td>₡${m.total}</td>
              </tr>`
            ).join("")}
          </tbody>
        </table>
        <h3>Total General: ₡${totalGeneral}</h3>
        <button onclick="window.print()">🖨 Imprimir</button>
      </div>
    `;
  } catch (e) {
    document.getElementById("resultado").innerText = "❌ Error al guardar: " + e.message;
  }
}

// --- Actualizar inventario ---
async function actualizarInventario(materiales) {
  const uid = auth?.currentUser?.uid || "desconocido";
  const docRef = doc(db, "inventarios", uid);
  const snap = await getDoc(docRef);

  let datos = {};
  if (snap.exists()) {
    datos = snap.data().materiales || {};
  }

  materiales.forEach(m => {
    if (!datos[m.material]) datos[m.material] = 0;
    datos[m.material] += m.peso;
  });

  await setDoc(docRef, { materiales: datos, actualizado: Timestamp.now() });
}

// --- Cerrar sesión ---
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
