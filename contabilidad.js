import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnIngreso").addEventListener("click", () => registrar("ingresos"));
  document.getElementById("btnEgreso").addEventListener("click", () => registrar("egresos"));

  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = btn.nextElementSibling;
      c.style.display = c.style.display === "block" ? "none" : "block";
    });
  });

  onAuthStateChanged(auth, user => { if(user) cargarContabilidad(user.uid); });
});

async function registrar(tipo) {
  const desc = document.getElementById(tipo==="ingresos"?"descIngreso":"descEgreso").value;
  const monto = parseFloat(document.getElementById(tipo==="ingresos"?"montoIngreso":"montoEgreso").value)||0;
  if (!desc||monto<=0) return alert("Complete bien los datos");
  await addDoc(collection(db,"contabilidad",auth.currentUser.uid,tipo),{descripcion:desc,monto,fecha:Timestamp.now()});
  cargarContabilidad(auth.currentUser.uid);
}

async function cargarContabilidad(uid) {
  const ingresosSnap = await getDocs(collection(db,"contabilidad",uid,"ingresos"));
  const egresosSnap = await getDocs(collection(db,"contabilidad",uid,"egresos"));
  const tabla=document.querySelector("#tablaContabilidad tbody"); tabla.innerHTML="";
  let totalIngresos=0,totalEgresos=0;
  ingresosSnap.forEach(d=>{const x=d.data();totalIngresos+=x.monto;tabla.innerHTML+=`<tr><td style="color:green">Ingreso</td><td>${x.descripcion}</td><td>₡${x.monto}</td><td>${x.fecha?.toDate().toLocaleString("es-CR")}</td></tr>`;});
  egresosSnap.forEach(d=>{const x=d.data();totalEgresos+=x.monto;tabla.innerHTML+=`<tr><td style="color:red">Egreso</td><td>${x.descripcion}</td><td>₡${x.monto}</td><td>${x.fecha?.toDate().toLocaleString("es-CR")}</td></tr>`;});
  document.getElementById("balance").innerText=`💰 Balance: ₡${totalIngresos-totalEgresos}`;
}
