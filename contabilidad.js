let movimientos = JSON.parse(localStorage.getItem("movimientos")) || [];
let grafico;

// Render inicial
mostrarTodos();

// Guardar movimiento manual
function agregarMovimiento() {
  const descripcion = document.getElementById("descripcion").value;
  const monto = parseFloat(document.getElementById("monto").value);
  const tipo = document.getElementById("tipoMovimiento").value;

  if (!descripcion || isNaN(monto)) {
    alert("Ingrese una descripción y un monto válido");
    return;
  }

  const nuevo = {
    descripcion,
    monto,
    tipo,
    fecha: new Date().toLocaleDateString(),
    hora: new Date().toLocaleTimeString()
  };

  movimientos.push(nuevo);
  localStorage.setItem("movimientos", JSON.stringify(movimientos));

  document.getElementById("descripcion").value = "";
  document.getElementById("monto").value = "";

  mostrarTodos();
}

// Mostrar todos los movimientos
function mostrarTodos() {
  renderListas(movimientos);
  mostrarBalance(movimientos);
  actualizarGrafico(movimientos);
}

// Filtrar ingresos o egresos
function filtrar(tipo) {
  const filtrados = movimientos.filter(m => m.tipo === tipo);
  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}

// Filtrar por fecha
function filtrarPorFecha() {
  const fecha = document.getElementById("filtroFecha").value;
  if (!fecha) {
    alert("Seleccione una fecha");
    return;
  }
  const filtrados = movimientos.filter(m => {
    const partes = m.fecha.split("/");
    const formatoISO = `${partes[2]}-${partes[1].padStart(2,"0")}-${partes[0].padStart(2,"0")}`;
    return formatoISO === fecha;
  });

  renderListas(filtrados);
  mostrarBalance(filtrados);
  actualizarGrafico(filtrados);
}

// Renderizar listas de ingresos y egresos
function renderListas(lista) {
  const ingresosUl = document.getElementById("listaIngresos");
  const egresosUl = document.getElementById("listaEgresos");

  ingresosUl.innerHTML = "";
  egresosUl.innerHTML = "";

  lista.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.fecha} ${m.hora} - ${m.descripcion}: ₡${m.monto}`;
    if (m.tipo === "ingreso") ingresosUl.appendChild(li);
    else egresosUl.appendChild(li);
  });
}

// Mostrar balance dinámico
function mostrarBalance(lista) {
  let totalIngresos = 0;
  let totalEgresos = 0;

  lista.forEach(m => {
    if (m.tipo === "ingreso") totalIngresos += m.monto;
    else totalEgresos += m.monto;
  });

  const balance = totalIngresos - totalEgresos;
  const balanceDiv = document.getElementById("balanceGeneral");
  balanceDiv.textContent = `Balance: ₡${balance}`;

  if (balance > 0) {
    balanceDiv.className = "positivo";
  } else if (balance < 0) {
    balanceDiv.className = "negativo";
  } else {
    balanceDiv.className = "neutro";
  }
}

// Gráfico de ingresos/egresos
function actualizarGrafico(lista) {
  let totalIngresos = 0;
  let totalEgresos = 0;

  lista.forEach(m => {
    if (m.tipo === "ingreso") totalIngresos += m.monto;
    else totalEgresos += m.monto;
  });

  const ctx = document.getElementById("grafico").getContext("2d");
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{
        label: "₡",
        data: [totalIngresos, totalEgresos],
        backgroundColor: ["#28a745", "#dc3545"]
      }]
    }
  });
}
