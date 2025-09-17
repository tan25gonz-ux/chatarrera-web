import { auth, db } from "./firebase.js";
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const materiales = [
  "Hierro", "Aluminio", "Cobre", "Bronce",
  "Batería", "Acero", "Cable", "Catalizador",
  "Plástico de lavadora", "Plástico de caja", "Carrocería"
];

const tabla = document.querySelector("#tablaInventario tbody");

function getSemanaRango() {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes...
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);

  return {
    inicio: Timestamp.fromDate(new Date(lunes.setHours(0,0,0,0))),
    fin: Timestamp.fromDate(new Date(sabado.setHours(23,59,59,999)))
  };
}

async function cargarInventario() {
  const { inicio, fin } = getSemanaRango();

  const q = query(
    collection(db, "pesajes"),
    where("fecha", ">=", inicio),
    where("fecha", "<=", fin)
  );
  const snap = await getDocs(q);

  // 🔹 Inicializar todos los materiales con 0 en cada día
  const datos = {};
  materiales.forEach(m => datos[m] = [0,0,0,0,0,0]);

  // 🔹 Sumar lo que viene de Firebase
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const fecha = data.fecha.toDate();
    const dia = fecha.getDay(); // 0=Domingo ... 6=Sábado

    if (dia === 0 || dia > 6) return; // ignorar Domingo
    const idx = dia - 1; // Lunes=0, Sábado=5

    if (Array.isArray(data.materiales)) {
      data.materiales.forEach(m => {
        // Normalizar nombre para que coincida con nuestra lista
        const nombre = m.material.charAt(0).toUpperCase() + m.material.slice(1).toLowerCase();
        if (datos[nombre] !== undefined) {
          datos[nombre][idx] += m.peso;
        }
      });
    }
  });

  // 🔹 Renderizar tabla con todos los materiales
  tabla.innerHTML = "";
  materiales.forEach(mat => {
    const valores = datos[mat];
    const total = valores.reduce((a,b) => a+b, 0);
    const fila = `
      <tr>
        <td>${mat}</td>
        <td>${valores[0]}</td>
        <td>${valores[1]}</td>
        <td>${valores[2]}</td>
        <td>${valores[3]}</td>
        <td>${valores[4]}</td>
        <td>${valores[5]}</td>
        <td><b>${total}</b></td>
      </tr>
    `;
    tabla.innerHTML += fila;
  });
}

document.addEventListener("DOMContentLoaded", cargarInventario);
