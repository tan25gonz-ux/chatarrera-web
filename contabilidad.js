import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let chartDona;
let chartBarras;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnIngreso").addEventListener("click", () => registrar("ingresos"));
  document.getElementById("btnEgreso").addEventListener("click", () => registrar("egresos"));

  // Acordeón
  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = btn.nextElementSibling;
      c.style.display = c.style.display === "block" ? "none" : "block";
    });
  });

  // Esperar autenticación
  onAuthStateChanged(auth, user => { 
    if(user) cargarContabilidad(user.uid); 
  });
});

async function registrar(tipo) {
  const desc = document.getElementById(tipo==="ingresos"?"descIngreso":"descEgreso").value;
  const monto = parseFloat(document.getElementById(tipo==="ingresos"?"montoIngreso":"montoEgreso").value)||0;

  if (!desc||monto<=0) {
    alert("Complete bien los datos");
    return;
  }

  try {
    await addDoc(collection(db,"contabilidad",auth.currentUser.uid,tipo),{
      descripcion:desc,
      monto,
      fecha:Timestamp.now()
    });
    cargarContabilidad(auth.currentUser.uid);
  } catch(e) {
    alert("❌ Error: " + e.message);
  }
}

async function cargarContabilidad(uid) {
  const ingresosSnap = await getDocs(collection(db,"contabilidad",uid,"ingresos"));
  const egresosSnap = await getDocs(collection(db,"contabilidad",uid,"egresos"));
  const tabla=document.querySelector("#tablaContabilidad tbody"); 
  tabla.innerHTML="";

  let totalIngresos=0,totalEgresos=0;
  const historico = {};

  ingresosSnap.forEach(d=>{
    const x=d.data();
    totalIngresos+=x.monto;
    const fecha=x.fecha?.toDate().toLocaleString("es-CR")||"";
    tabla.innerHTML+=`<tr><td style="color:green">Ingreso</td><td>${x.descripcion}</td><td>₡${x.monto}</td><td>${fecha}</td></tr>`;
    const mes=obtenerMes(x.fecha?.toDate()||new Date());
    if(!historico[mes]) historico[mes]={ingresos:0,egresos:0};
    historico[mes].ingresos+=x.monto;
  });

  egresosSnap.forEach(d=>{
    const x=d.data();
    totalEgresos+=x.monto;
    const fecha=x.fecha?.toDate().toLocaleString("es-CR")||"";
    tabla.innerHTML+=`<tr><td style="color:red">Egreso</td><td>${x.descripcion}</td><td>₡${x.monto}</td><td>${fecha}</td></tr>`;
    const mes=obtenerMes(x.fecha?.toDate()||new Date());
    if(!historico[mes]) historico[mes]={ingresos:0,egresos:0};
    historico[mes].egresos+=x.monto;
  });

  document.getElementById("balance").innerText=`💰 Balance: ₡${totalIngresos-totalEgresos}`;
  actualizarGrafico(totalIngresos,totalEgresos);
  actualizarHistorico(historico);
}

function obtenerMes(fecha) {
  const año=fecha.getFullYear();
  const mes=String(fecha.getMonth()+1).padStart(2,"0");
  return `${año}-${mes}`;
}

function actualizarGrafico(ingresos,egresos){
  const ctx=document.getElementById("graficoContabilidad").getContext("2d");
  if(chartDona) chartDona.destroy();
  chartDona=new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:["Ingresos","Egresos"],
      datasets:[{
        data:[ingresos,egresos],
        backgroundColor:["#39d353","#ff4d4d"]
      }]
    },
    options:{responsive:true,plugins:{legend:{position:"bottom"}}}
  });
}

function actualizarHistorico(historico){
  const ctx=document.getElementById("graficoHistorico").getContext("2d");
  if(chartBarras) chartBarras.destroy();

  const labels=Object.keys(historico).sort();
  const ingresosData=labels.map(m=>historico[m].ingresos);
  const egresosData=labels.map(m=>historico[m].egresos);

  chartBarras=new Chart(ctx,{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Ingresos",data:ingresosData,backgroundColor:"#39d353"},
        {label:"Egresos",data:egresosData,backgroundColor:"#ff4d4d"}
      ]
    },
    options:{
      responsive:true,
      plugins:{legend:{position:"bottom"}},
      scales:{y:{beginAtZero:true}}
    }
  });
}
