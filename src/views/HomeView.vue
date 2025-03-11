<template>
  <v-row class="full-screen" align="center" justify="center">
    <!-- Encabezado con título y descripción -->
    <v-col cols="12" class="text-center">
      <h1 class="titulo">
        <v-icon large class="mr-2">mdi-home</v-icon>
        Bienvenido a Plataforma Alpha
      </h1>
      <p class="descripcion">
        Explora las opciones del menú lateral para comenzar.
      </p>
      <h2 class="subtitulo">
        <v-icon large class="mr-2">mdi-school</v-icon>
        Administración Académica
      </h2>
      <p class="descripcion">
        Gestiona tus cursos, estudiantes y reportes de forma intuitiva.
      </p>
    </v-col>

    <!-- Botones de acción -->
    <v-row class="botones" justify="center" align="center">
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/gestion/registro" class="boton">
          <v-icon left>mdi-account-plus</v-icon>
          Registro de Estudiantes
        </router-link>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/gestion/asistencia" class="boton">
          <v-icon left>mdi-calendar-check</v-icon>
          Control de Asistencia
        </router-link>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/gestion/reportes" class="boton">
          <v-icon left>mdi-chart-box-outline</v-icon>
          Registro de notas
        </router-link>
      </v-col>
    </v-row>

    <!-- Información adicional -->
    <v-row class="informacion" justify="center">
      <v-col cols="12" class="text-center">
        <p class="informacion-texto">
          Optimiza la gestión académica con herramientas avanzadas y una interfaz sencilla. ¡Descubre todas las funcionalidades!
        </p>
      </v-col>
    </v-row>
  </v-row>
</template>

<script>
export default {
  name: "HomeView",
};
</script>

<style scoped>
.full-screen {
  min-height: 100vh;
  background-color: #eef2f7;
}

/* Título y descripciones */
.titulo {
  font-size: 48px;
  font-weight: bold;
  color: #003366; /* Azul oscuro */
  margin-bottom: 10px;
}

.subtitulo {
  font-size: 32px;
  color: #00509e; /* Azul medio */
  margin-top: 20px;
  text-transform: uppercase;
}

.descripcion {
  font-size: 20px;
  color: #555;
  margin: 10px 0;
  font-weight: 300;
}

/* Botones */
.botones {
  margin-top: 40px;
}

.boton {
  display: inline-flex;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #003366, #00509e);
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease-in-out;
  min-width: 220px;
  justify-content: center;
}

.boton:hover {
  background: linear-gradient(135deg, #00509e, #003366);
  transform: scale(1.05);
}

.v-icon {
  margin-right: 8px;
}

/* Información adicional */
.informacion {
  margin-top: 50px;
}

.informacion-texto {
  font-size: 22px;
  color: #003366;
  font-weight: 600;
  line-height: 1.6;
  margin-top: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .botones {
    flex-direction: column;
  }
  .boton {
    width: 80%;
    margin-bottom: 20px;
  }
}
</style>
