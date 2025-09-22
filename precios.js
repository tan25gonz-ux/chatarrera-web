import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { doc, getDoc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Cargar precios actuales
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "precios", user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data().materiales;
      for (const mat in data) {
        const input = document.getElementById("precio-" + mat);
        if (input) input.value = data[mat];
      }
    }
  }
});

// Guardar precios modificados
document.getElementById("btnGuardarPrecios").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("No hay usuario logueado");

  const precios = {};
  document.querySelectorAll("#precios input").forEach(input => {
    const mat = input.id.replace("precio-", "");
    precios[mat] = parseFloat(input.value) || 0;
  });

  await setDoc(doc(db, "precios", user.uid), {
    materiales: precios,
    actualizado: Timestamp.now()
  });

  alert("✅ Precios actualizados");
});
