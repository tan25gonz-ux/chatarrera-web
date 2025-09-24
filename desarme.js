import { auth, db } from "./firebase.js";
import { 
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnDesarmar")?.addEventListener("click", procesarDesarme);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ Usuario listo para desarme:", user.uid);
      cargarHistorial(user.uid);
    }
  });
});

// ---- Procesar desarme ----
async function procesarDesarme() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return alert("No hay usuario logueado");

  const origen = document.getElementById("materialOrigen")?.value;
  const destino = document.getElementById("materialDestino")?.value;
  const cantidad = parseFloat(document.getElementById("cantidadDesarme")?.value) || 0;

  if (!origen || !destino || cantidad <= 0) {
    return alert("⚠️ Complete todos los campos correctamente");
  }

  if (origen === destino) {
    return alert("⚠️ El material origen y destino no pueden ser iguales");
  }

  try {
    // 📌 Leer inventario actual
    const ref = doc(db, "inventarios", uid);
    const snap = await getDoc(ref);
    let datos = snap.exists() ? (snap.data().materiales || {}) : {};

    const stockOrigen = Number(datos[origen] || 0);

    // 📌 Validar stock suficiente
    if (cantidad > stockOrigen) {
      return alert(`❌ Stock insuficiente de ${origen}. Disponible: ${stockOrigen} kg`);
    }

    // 📌 Restar del origen y sumar al destino
    datos[origen] = stockOrigen - cantidad;
    datos[destino] = (datos[destino] || 0) + cantidad;

    // 📌 Guardar inventario actualizado
    await setDoc(ref, { materiales: datos, actualizado: serverTimestamp() }, { merge: true });

    // 📌 Guardar en colección "desarmes"
    await addDoc(collection(db, "desarmes"), {
      uid,
      origen,
      destino,
      cantidad,
      fecha: serverTimestamp()
    });

    document.getElementById("resultado").innerHTML = `
      <p>✅ Se desarmaron ${cantidad} kg de ${origen} en ${destino}.</p>
    `;

    document.getElementById("cantidadDesarme").value = "";
  } catch (e) {
    console.error(e);
    alert("❌ Error en desarme: " + (e?.message || e));
  }
}

// ---- Cargar historial de desarmes ----
function cargarHistorial(uid) {
  const q = query(
    collection(db, "desarmes"),
    where("uid", "==", uid),
    orderBy("fecha", "desc")
  );

  const tabla = document.querySelector("#tablaDesarmes tbody");

  onSnapshot(q, (snap) => {
    tabla.innerHTML = "";
    snap.forEach(docu => {
      const d = docu.data();
      const fecha = d.fecha?.toDate().toLocaleString("es-CR") || "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${d.origen}</td>
        <td>${d.destino}</td>
        <td>${d.cantidad}</td>
      `;
      tabla.appendChild(tr);
    });
  });
}
