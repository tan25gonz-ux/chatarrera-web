import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await cargarContabilidad(user.uid);
  }
});

async function cargarContabilidad(uid) {
  const ingresosSnap = await getDocs(collection(db, "contabilidad", uid, "ingresos"));
  const egresosSnap = await getDocs(collection(db, "contabilidad", uid, "egresos"));

  const ingresos = ingresosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const egresos = egresosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderTabla("tablaIngresos", ingresos);
  renderTabla("tablaEgresos", egresos);
}

// --- Render tablas con fechas en hora de Costa Rica ---
function renderTabla(idTabla, datos) {
  const tbody = document.querySelector(`#${idTabla} tbody`);
  tbody.innerHTML = "";

  datos.forEach(d => {
    const fecha = d.fecha?.toDate().toLocaleString("es-CR", {
      timeZone: "America/Costa_Rica",
      dateStyle: "short",
      timeStyle: "short"
    }) || "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${d.descripcion}</td>
      <td>₡${d.monto}</td>
    `;
    tbody.appendChild(tr);
  });
}
