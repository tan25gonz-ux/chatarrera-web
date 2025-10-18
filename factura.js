import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { doc, getDoc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";


onAuthStateChanged(auth, async (user) => {
  if (user) {
    const ref = doc(db, "facturas", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      document.getElementById("nombreLocal").value = data.nombreLocal || "";
      document.getElementById("numHacienda").value = data.numHacienda || "";
      document.getElementById("telefono1").value = data.telefono1 || "";
      document.getElementById("telefono2").value = data.telefono2 || "";
    }
  }
});

document.getElementById("btnGuardarFactura").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("⚠ No hay usuario logueado");

  const data = {
    nombreLocal: document.getElementById("nombreLocal").value,
    numHacienda: document.getElementById("numHacienda").value,
    telefono1: document.getElementById("telefono1").value,
    telefono2: document.getElementById("telefono2").value,
    actualizado: Timestamp.now()
  };

  await setDoc(doc(db, "facturas", user.uid), data);
  alert("✅ Configuración de factura guardada");
});
