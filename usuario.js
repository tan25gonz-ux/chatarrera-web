import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { collection, addDoc, Timestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  // Conectar select tipo
  const tipoSelect = document.getElementById("tipo");
  if (tipoSelect) {
    tipoSelect.addEventListener("change", mostrarCampos);
    console.log("[bind] change -> #tipo");
  } else {
    console.warn('No se encontró <select id="tipo">');
  }

  // Botones (bind directo)
  const btnRegistrar = document.getElementById("btnRegistrar");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", (e) => { e.preventDefault(); console.log("[click] Registrar"); registrarPesaje(); });
    console.log("[bind] click -> #btnRegistrar");
  } else {
    console.warn("No se encontró #btnRegistrar");
  }

  const btnAgregarExtra = document.getElementById("btnAgregarExtra");
  if (btnAgregarExtra) {
    btnAgregarExtra.addEventListener("click", (e) => { e.preventDefault(); console.log("[click] AgregarExtra"); agregarMaterial(); });
    console.log("[bind] click -> #btnAgregarExtra");
  } else {
    console.warn("No se encontró #btnAgregarExtra");
  }

  document.getElementById("btnCerrar")?.addEventListener("click", cerrarSesion);

  // 🔁 Fallback: delegación de eventos (por si el bind directo no ocurre)
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.id === "btnRegistrar") {
      e.preventDefault();
      console.log("[delegate] Registrar");
      registrarPesaje();
    }
    if (t.id === "btnAgregarExtra") {
      e.preventDefault();
      console.log("[delegate] AgregarExtra");
      agregarMaterial();
    }
  });

  // Esperar a que Firebase confirme usuario y cargar precios
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("[auth] usuario:", user.uid);
      cargarPrecios(user.uid);
    } else {
      console.warn("⚠ No hay usuario logueado");
    }
  });
});

// ---- Mostrar campos según tipo ----
function mostrarCampos() {
  const tipo = document.getElementById("tipo")?.value || "";
  const campos = document.getElementById("campos");
  if (!campos) return;

  let html = "";
  switch (tipo) {
    case "camionGrande":
      html = `
        <h3>Camión Grande (Hierro)</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Placa: <input type="text" id="placa"></label>
        <label>Delantera llena (kg): <input type="number" id="delanteraLlena"></label>
        <label>Trasera llena (kg): <input type="number" id="traseraLlena"></label>
        <label>Delantera vacía (kg): <input type="number" id="delanteraVacia"></label>
        <label>Trasera vacía (kg): <input type="number" id="traseraVacia"></label>
      `;
      break;

    case "camionPequeno":
      html = `
        <h3>Camión Pequeño (Hierro)</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Placa: <input type="text" id="placa"></label>
        <label>Peso lleno (kg): <input type="number" id="lleno"></label>
        <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      `;
      break;

    case "carreta":
      html = `
        <h3>Carreta</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Peso lleno (kg): <input type="number" id="lleno"></label>
        <label>Peso vacío (kg): <input type="number" id="vacio"></label>
      `;
      break;

    case "mano":
      html = `
        <h3>A Mano</h3>
        <label>Cédula: <input type="text" id="cedula"></label>
        <label>Peso directo (kg): <input type="number" id="peso"></label>
      `;
      break;

    default:
      html = "";
  }

  campos.innerHTML = html;
}

// ---- Agregar material extra ----
function agregarMaterial() {
  const mat = document.getElementById("materialSelect")?.value || "";
  const peso = parseFloat(document.getElementById("pesoMaterial")?.value) || 0;

  if (!mat || peso <= 0) {
    alert("Seleccione un material y un peso válido");
    return;
  }

  const lista = document.getElementById("listaExtras");
  if (!lista) return;

  const item = document.createElement("p");
  item.textContent = `${peso} kg de ${mat}`;
  item.dataset.material = mat;
  item.dataset.peso = String(peso);

  const btnQuitar = document.createElement("button");
  btnQuitar.textContent = "❌";
  btnQuitar.type = "button";
  btnQuitar.onclick = () => item.remove();

  item.appendChild(btnQuitar);
  lista.appendChild(item);

  // reset campos de extra
  const sel = document.getElementById("materialSelect");
  const inp = document.getElementById("pesoMaterial");
  if (sel) sel.value = "";
  if (inp) inp.value = "";
}

// ---- Cargar precios desde Firestore (solo lectura en usuario.html) ----
async function cargarPrecios(uid) {
  const target = document.getElementById("preciosUsuario");
  if (!target) return;

  try {
    const ref = doc(db, "precios", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data().materiales || {};
      const html = Object.entries(data)
        .map(([mat, val]) => `<p><strong>${mat}:</strong> ₡${val}</p>`)
        .join("");
      target.innerHTML = html || "Sin datos.";
    } else {
      target.textContent = "❌ No hay precios configurados.";
    }
  } catch (err) {
    console.error("Error cargando precios:", err);
    target.textContent = "Error cargando precios.";
  }
}

// ---- Registrar pesaje ----
async function registrarPesaje() {
  try {
    const tipo = document.getElementById("tipo")?.value;
    if (!tipo) {
      alert("Seleccione un tipo de transporte");
      return;
    }

    const cedula = document.getElementById("cedula")?.value || "";
    const placa  = document.getElementById("placa")?.value || "";

    let neto = 0;
    if (tipo === "camionGrande") {
      const dl = parseFloat(document.getElementById("delanteraLlena")?.value) || 0;
      const tl = parseFloat(document.getElementById("traseraLlena")?.value) || 0;
      const dv = parseFloat(document.getElementById("delanteraVacia")?.value) || 0;
      const tv = parseFloat(document.getElementById("traseraVacia")?.value) || 0;
      neto = (dl + tl) - (dv + tv);
    } else if (tipo === "camionPequeno" || tipo === "carreta") {
      const lleno = parseFloat(document.getElementById("lleno")?.value) || 0;
      const vacio = parseFloat(document.getElementById("vacio")?.value) || 0;
      neto = lleno - vacio;
    } else if (tipo === "mano") {
      neto = parseFloat(document.getElementById("peso")?.value) || 0;
    }

    // Materiales: hierro por defecto + extras
    const materiales = [{ material: "Hierro", peso: neto }];
    document.querySelectorAll("#listaExtras p").forEach(p => {
      materiales.push({ material: p.dataset.material, peso: parseFloat(p.dataset.peso) });
    });

    // Cargar precios desde Firebase
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      alert("No hay usuario logueado");
      return;
    }

    const docRef = doc(db, "precios", uid);
    const snap = await getDoc(docRef);
    const precios = snap.exists() ? snap.data().materiales : {};

    const materialesConTotal = materiales.map(m => {
      const precioUnit = precios[m.material] || 0;
      const total = m.peso * precioUnit;
      return { ...m, precioUnit, total };
    });

    const totalGeneral = materialesConTotal.reduce((acc, m) => acc + m.total, 0);

    await addDoc(collection(db, "pesajes"), {
      usuario: auth?.currentUser?.email || "desconocido",
      tipo,
      cedula,
      placa,
      materiales: materialesConTotal,
      totalGeneral,
      fecha: Timestamp.now()
    });

    await actualizarInventario(materiales);

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

    // Limpiar formulario
    limpiarFormulario();
    console.log("[ok] Registro completado");

  } catch (e) {
    console.error("Error en registrarPesaje:", e);
    alert("❌ Error al registrar: " + (e?.message || e));
  }
}

// ---- Limpiar formulario ----
function limpiarFormulario() {
  // Campos generales
  document.getElementById("cedula")?.value = "";
  document.getElementById("placa")?.value = "";
  document.getElementById("delanteraLlena")?.value = "";
  document.getElementById("traseraLlena")?.value = "";
  document.getElementById("delanteraVacia")?.value = "";
  document.getElementById("traseraVacia")?.value = "";
  document.getElementById("lleno")?.value = "";
  document.getElementById("vacio")?.value = "";
  document.getElementById("peso")?.value = "";

  // Limpiar lista de materiales extra
  const lista = document.getElementById("listaExtras");
  if (lista) lista.innerHTML = "";

  // Reset de select y campo de peso extra
  const sel = document.getElementById("materialSelect");
  const inp = document.getElementById("pesoMaterial");
  if (sel) sel.value = "";
  if (inp) inp.value = "";

  // Resetear tipo de transporte y limpiar campos dinámicos
  const tipoSelect = document.getElementById("tipo");
  if (tipoSelect) tipoSelect.value = "";
  const campos = document.getElementById("campos");
  if (campos) campos.innerHTML = "";

  console.log("[clean] formulario reseteado");
}

// ---- Actualizar inventario ----
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

// ---- Cerrar sesión ----
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
