// ventas.js
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Registrar venta
async function registrarVenta(materiales) {
  const user = auth.currentUser;
  if (!user) {
    alert("⚠️ Debes iniciar sesión para registrar ventas");
    return;
  }

  const uid = user.uid;

  try {
    // 1. Cargar inventario actual
    const invRef = doc(db, "inventarios", uid);
    const snap = await getDoc(invRef);
    let data = snap.exists() ? snap.data() : { materiales: {} };

    // 2. Restar cantidades del inventario
    materiales.forEach((m) => {
      if (!data.materiales[m.material]) data.materiales[m.material] = 0;
      data.materiales[m.material] -= m.peso;
      if (data.materiales[m.material] < 0) data.materiales[m.material] = 0;
    });

    await setDoc(invRef, data, { merge: true });

    // 3. Guardar en la colección de pesajes (registro agrupado)
    await addDoc(collection(db, "pesajes"), {
      usuario: user.email,
      uid: uid,
      materiales: materiales,
      fecha: serverTimestamp()
    });

    // 4. Guardar cada material en inventario_historial (registro individual)
    for (const m of materiales) {
      await addDoc(collection(db, "inventario_historial"), {
        uid: uid,
        material: m.material,
        peso: m.peso,
        fecha: serverTimestamp()
      });
    }

    alert("✅ Venta registrada con éxito");
  } catch (e) {
    console.error("Error registrando venta:", e);
    alert("❌ Error registrando venta");
  }
}

// Ejemplo de cómo capturas el click en tu HTML
document.getElementById("btnRegistrar")?.addEventListener("click", async () => {
  // aquí recolectas los materiales del formulario
  const materiales = [];

  document.querySelectorAll("#listaExtras .item").forEach((div) => {
    const material = div.querySelector(".nombre")?.textContent || "";
    const peso = parseFloat(div.querySelector(".peso")?.textContent) || 0;
    if (material && peso > 0) {
      materiales.push({ material, peso });
    }
  });

  if (materiales.length === 0) {
    alert("⚠️ Agregue al menos un material");
    return;
  }

  await registrarVenta(materiales);
});
