import { auth, db } from "./firebase.js";
import { 
  collection, addDoc, serverTimestamp, doc, getDoc, setDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVender")?.addEventListener("click", registrarVenta);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Usuario conectado:", user.uid);
      cargarVentas(user.uid); // 🔥 cargar ventas en la tabla
    }
  });
});

// ---- Registrar venta ----
async function registrarVenta() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return alert("No hay usuario logueado");

  const material = document.getElementById("materialVenta")?.value;
  const peso = parseFloat(document.getElementById("pesoVenta")?.value) || 0;
  const contenedor = document.getElementById("contenedorVenta")?.value || "";

  if (!material || peso <= 0 || !contenedor) {
    return alert("⚠️ Complete todos los campos antes de registrar");
  }

  try {
    // Guardar en colección ventas
    await addDoc(collection(db, "ventas"), {
      usuario: auth?.currentUser?.email || "desconocido",
      uid,
      material,
      peso,
      contenedor,
      fecha: serverTimestamp()
    });

    // Actualizar inventario (restar)
    await actualizarInventario(uid, material, peso);

    // Guardar en movimientos de inventario
    await addDoc(collection(db, "inventario_movimientos"), {
      uid,
      material,
      cantidad: peso,
      tipo: "salida",
      fecha: serverTimestamp()
    });

    alert("✅ Venta registrada correctamente");
    limpiarFormulario();
  } catch (e) {
    console.error(e);
    alert("❌ Error al registrar venta: " + (e?.message || e));
  }
}

// ---- Actualizar inventario (restar) ----
async function actualizarInventario(uid, material, peso) {
  const ref = doc(db, "inventarios", uid);
  const snap = await getDoc(ref);
  let datos = snap.exists() ? (snap.data().materiales || {}) : {};

  datos[material] = (datos[material] || 0) - peso;
  if (datos[material] < 0) datos[material] = 0; // evitar negativos

  await setDoc(ref, { materiales: datos, actualizado: serverTimestamp() }, { merge: true });
}

// ---- Cargar ventas en la tabla ----
function cargarVentas(uid) {
  const tabla = document.querySelector("#tablaVentas tbody");
  if (!tabla) return;

  const q = collection(db, "ventas");
  onSnapshot(q, (snap) => {
    tabla.innerHTML = "";
    snap.forEach(docu => {
      const d = docu.data();
      if (d.uid === uid) {
        const fecha = d.fecha?.toDate().toLocaleString("es-CR") || "-";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${fecha}</td>
          <td>${d.material}</td>
          <td>${d.peso}</td>
          <td>${d.contenedor}</td>
        `;
        tabla.appendChild(tr);
      }
    });
  });
}

// ---- Limpiar formulario ----
function limpiarFormulario() {
  document.getElementById("pesoVenta").value = "";
  document.getElementById("contenedorVenta").value = "";
  document.getElementById("materialVenta").value = "Hierro";
}
