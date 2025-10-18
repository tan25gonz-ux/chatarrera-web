import { auth, db } from "./firebase.js";
import { 
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let desarmes = []; 

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnDesarmar")?.addEventListener("click", procesarDesarme);
  document.getElementById("btnFiltrar")?.addEventListener("click", aplicarFiltros);
  document.getElementById("btnVerTodo")?.addEventListener("click", () => renderTabla(desarmes));

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ Usuario listo para desarme:", user.uid);
      cargarHistorial(user.uid);
    }
  });
});


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
    const ref = doc(db, "inventarios", uid);
    const snap = await getDoc(ref);
    let datos = snap.exists() ? (snap.data().materiales || {}) : {};

    const stockOrigen = Number(datos[origen] || 0);
    if (cantidad > stockOrigen) {
      return alert(`❌ Stock insuficiente de ${origen}. Disponible: ${stockOrigen} kg`);
    }

    datos[origen] = stockOrigen - cantidad;
    datos[destino] = (datos[destino] || 0) + cantidad;

    await setDoc(ref, { materiales: datos, actualizado: serverTimestamp() }, { merge: true });

    await addDoc(collection(db, "desarmes"), {
      uid,
      origen,
      destino,
      cantidad,
      detalle: `${cantidad} kg de ${origen} → ${destino}`,
      fecha: serverTimestamp()
    });

    await addDoc(collection(db, "inventario_movimientos"), {
      uid,
      material: origen,
      cantidad,
      tipo: "salida",
      detalle: "desarme",
      fecha: serverTimestamp()
    });
    await addDoc(collection(db, "inventario_movimientos"), {
      uid,
      material: destino,
      cantidad,
      tipo: "entrada",
      detalle: "desarme",
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

function cargarHistorial(uid) {
  const q = query(
    collection(db, "desarmes"),
    where("uid", "==", uid),
    orderBy("fecha", "desc")
  );

  const tabla = document.querySelector("#tablaDesarmes tbody");

  onSnapshot(q, (snap) => {
    desarmes = [];
    snap.forEach(docu => {
      const d = docu.data();
      desarmes.push({
        fecha: d.fecha?.toDate() || new Date(),
        origen: d.origen,
        destino: d.destino,
        cantidad: d.cantidad,
        detalle: d.detalle || `${d.cantidad} kg de ${d.origen} → ${d.destino}`
      });
    });
    renderTabla(desarmes);
  });
}

function renderTabla(data) {
  const tabla = document.querySelector("#tablaDesarmes tbody");
  tabla.innerHTML = "";

  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.fecha.toLocaleString("es-CR")}</td>
      <td>${d.origen}</td>
      <td>${d.destino}</td>
      <td>${d.cantidad}</td>
      <td>${d.detalle}</td>
    `;
    tabla.appendChild(tr);
  });
}

function aplicarFiltros() {
  let filtrados = [...desarmes];
  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;

  if (desde) filtrados = filtrados.filter(d => d.fecha >= new Date(desde));
  if (hasta) filtrados = filtrados.filter(d => d.fecha <= new Date(hasta + "T23:59:59"));

  renderTabla(filtrados);
}
