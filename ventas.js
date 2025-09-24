import { auth, db } from "./firebase.js";
import { 
  collection, addDoc, serverTimestamp, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnRegistrar")?.addEventListener("click", registrarVenta);
  document.getElementById("btnAgregarExtra")?.addEventListener("click", agregarMaterial);
  document.getElementById("btnCerrar")?.addEventListener("click", cerrarSesion);

  onAuthStateChanged(auth, (user) => {
    if (user) console.log("Usuario conectado:", user.uid);
  });
});

// ---- Agregar material extra ----
function agregarMaterial() {
  const mat = document.getElementById("materialSelect")?.value || "";
  const peso = parseFloat(document.getElementById("pesoMaterial")?.value) || 0;
  if (!mat || peso <= 0) return alert("Seleccione un material y un peso válido");

  const lista = document.getElementById("listaExtras");
  if (!lista) return;

  const p = document.createElement("p");
  p.textContent = `${peso} kg de ${mat}`;
  p.dataset.material = mat;
  p.dataset.peso = String(peso);

  const b = document.createElement("button");
  b.textContent = "❌"; b.type = "button"; b.onclick = () => p.remove();
  p.appendChild(b);
  lista.appendChild(p);

  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
}

// ---- Registrar venta ----
async function registrarVenta() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return alert("No hay usuario logueado");

  const numeroContenedor = document.getElementById("contenedor")?.value || "";
  if (!numeroContenedor) return alert("Ingrese un número de contenedor");

  // Materiales
  const materiales = [];
  document.querySelectorAll("#listaExtras p").forEach(p => {
    materiales.push({ material: p.dataset.material, peso: parseFloat(p.dataset.peso) });
  });

  if (materiales.length === 0) return alert("Agregue al menos un material");

  try {
    // Guardar venta en colección
    await addDoc(collection(db, "ventas"), {
      usuario: auth?.currentUser?.email || "desconocido",
      contenedor: numeroContenedor,
      materiales,
      fecha: serverTimestamp()
    });

    // Actualizar inventario (descontar)
    await actualizarInventario(materiales);

    // 🔥 Guardar historial de movimientos (salida)
    for (let m of materiales) {
      if (m.material && m.peso > 0) {
        await addDoc(collection(db, "inventario_movimientos"), {
          uid,
          material: m.material,
          cantidad: m.peso,
          tipo: "salida", // 👈 movimiento de salida
          fecha: serverTimestamp()
        });
      }
    }

    alert("✅ Venta registrada con historial en inventario");
    limpiarFormulario();
  } catch (e) {
    console.error(e);
    alert("❌ Error al registrar venta: " + (e?.message || e));
  }
}

// ---- Actualizar inventario (restar) ----
async function actualizarInventario(materiales) {
  const uid = auth?.currentUser?.uid || "desconocido";
  const ref = doc(db, "inventarios", uid);
  const snap = await getDoc(ref);
  let datos = snap.exists() ? (snap.data().materiales || {}) : {};

  materiales.forEach(m => { 
    datos[m.material] = (datos[m.material] || 0) - m.peso; 
    if (datos[m.material] < 0) datos[m.material] = 0; // evitar negativos
  });

  await setDoc(ref, { materiales: datos, actualizado: serverTimestamp() }, { merge: true });
}

// ---- Util ----
function limpiarFormulario() {
  const lista = document.getElementById("listaExtras");
  if (lista) lista.innerHTML = "";

  document.getElementById("materialSelect").value = "";
  document.getElementById("pesoMaterial").value = "";
  document.getElementById("contenedor").value = "";
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
