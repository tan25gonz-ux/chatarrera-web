<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Registro de Pesaje - Chatarrera</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container flex">
    <!-- Columna izquierda: Pesajes -->
    <div class="col">
      <h1>Registro de Pesaje</h1>

      <div class="card">
        <label for="tipo">Tipo de transporte:</label>
        <select id="tipo">
          <option value="">-- Seleccione --</option>
          <option value="camionGrande">Camión Grande</option>
          <option value="camionPequeno">Camión Pequeño</option>
          <option value="carreta">Carreta</option>
          <option value="mano">A Mano</option>
        </select>

        <div id="campos"></div>

        <!-- Materiales extra -->
        <h3>Materiales extra</h3>
        <div id="listaExtras"></div>
        <select id="materialSelect">
          <option value="">-- Seleccione material --</option>
          <option value="Hierro">Hierro</option>
          <option value="Aluminio">Aluminio</option>
          <option value="Cobre">Cobre</option>
          <option value="Bronce">Bronce</option>
          <option value="Batería">Batería</option>
          <option value="Acero">Acero</option>
          <option value="Cable">Cable</option>
          <option value="Catalizador">Catalizador</option>
          <option value="Plástico de lavadora">Plástico de lavadora</option>
          <option value="Plástico de caja">Plástico de caja</option>
          <option value="Carrocería">Carrocería</option>
        </select>
        <input type="number" id="pesoMaterial" placeholder="Peso (kg)">
        <button type="button" onclick="agregarMaterial()">➕ Agregar material</button>

        <button id="btnRegistrar">Registrar</button>
      </div>

      <!-- Resultado: aquí se inserta la factura -->
      <div id="resultado" class="resultado"></div>

      <!-- Navegación -->
      <button onclick="window.location.href='inventario.html'">📊 Ver Inventario</button>
      <button onclick="window.location.href='ventas.html'">🛒 Registrar Venta</button>
      <button onclick="window.location.href='contabilidad.html'">💵 Ver Contabilidad</button>
      <button id="btnCerrar" type="button">Cerrar Sesión</button>
    </div>

    <!-- Columna derecha: Precios -->
    <div class="col">
      <div class="accordion">
        <button class="accordion-toggle">💲 Precios de materiales</button>
        <div class="accordion-content" id="precios">
          <label>Hierro: <input type="number" id="precio-Hierro" value="200"></label>
          <label>Aluminio: <input type="number" id="precio-Aluminio" value="500"></label>
          <label>Cobre: <input type="number" id="precio-Cobre" value="2000"></label>
          <label>Bronce: <input type="number" id="precio-Bronce" value="1500"></label>
          <label>Batería: <input type="number" id="precio-Batería" value="300"></label>
          <label>Acero: <input type="number" id="precio-Acero" value="250"></label>
          <label>Cable: <input type="number" id="precio-Cable" value="1000"></label>
          <label>Catalizador: <input type="number" id="precio-Catalizador" value="4000"></label>
          <label>Plástico de lavadora: <input type="number" id="precio-Plástico de lavadora" value="50"></label>
          <label>Plástico de caja: <input type="number" id="precio-Plástico de caja" value="30"></label>
          <label>Carrocería: <input type="number" id="precio-Carrocería" value="100"></label>
        </div>
      </div>
    </div>
  </div>

  <script type="module" src="usuario.js"></script>
</body>
</html>
