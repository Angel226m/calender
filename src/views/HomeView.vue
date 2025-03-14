<template>
  <v-row class="full-screen" align="center" justify="center">
    <!-- Icono decorativo en la esquina superior derecha -->
    <div class="corner-icon">
      <v-img :src="customIcon" class="animated fadeIn" contain height="80" width="80" />
    </div>

    <!-- Encabezado con título y descripción -->
    <v-col cols="12" class="text-center header-container animated">
      <h1 class="titulo">
        <v-icon large class="mr-2 animated bounceIn">mdi-home</v-icon>
        Bienvenido a ClassVibes
      </h1>
      <p class="descripcion animated">
        La plataforma inteligente para la gestión académica. Explora el menú lateral y descubre funcionalidades diseñadas para optimizar tu experiencia.
      </p>
      <h2 class="subtitulo animated slideInUp">
        <v-icon large class="mr-2 animated bounceIn">mdi-school</v-icon>
        Administración Académica con Estilo
      </h2>
      <p class="descripcion animated">
        Administra tus cursos, estudiantes y reportes de manera intuitiva y moderna.
      </p>
    </v-col>

    <!-- Botones de acción -->
    <v-row class="botones animated" justify="center" align="center">
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/gestion/registro" class="boton">
          <v-icon left class="animated bounceIn">mdi-account-plus</v-icon>
          Registro de Estudiantes
        </router-link>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/gestion/asistencia" class="boton">
          <v-icon left class="animated bounceIn">mdi-calendar-check</v-icon>
          Control de Asistencia
        </router-link>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/gestion/reportes" class="boton">
          <v-icon left class="animated bounceIn">mdi-chart-box-outline</v-icon>
          Registro de Notas
        </router-link>
      </v-col>
    </v-row>

    <!-- Información adicional -->
    <v-row class="informacion animated" justify="center">
      <v-col cols="12" class="text-center">
        <p class="informacion-texto">
          Optimiza la gestión académica con herramientas avanzadas y una interfaz moderna. ¡Explora y transforma tu experiencia educativa!
        </p>
      </v-col>
    </v-row>
  </v-row>
</template>

<script>
import customIcon from "@/Store/iciono.png";
export default {
  name: "HomeView",
  data() {
    return {
      customIcon,
    };
  },
};
</script>

<style scoped>
/* Contenedor completo sin scroll */
.full-screen {
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #eef2f7, #dde6f0);
  padding: 20px;
  position: relative;
}

/* Icono decorativo en la esquina superior derecha */
.corner-icon {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes bounceIn {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  80% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* Clases base de animación */
.animated {
  animation: fadeIn 0.8s ease-out both;
}
.slideInUp {
  animation: slideInUp 0.8s ease-out both;
}
.bounceIn {
  animation: bounceIn 0.8s ease-out both;
}

/* Encabezado */
.header-container {
  margin-bottom: 40px;
}
.titulo {
  font-size: 50px;
  font-weight: 700;
  color: #003366;
  margin-bottom: 15px;
  font-family: 'Roboto', sans-serif;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
}
.subtitulo {
  font-size: 36px;
  color: #00509e;
  margin-top: 25px;
  text-transform: uppercase;
  font-family: 'Roboto', sans-serif;
  letter-spacing: 1px;
}
.descripcion {
  font-size: 22px;
  color: #555;
  margin: 12px 0;
  font-weight: 300;
  font-family: 'Roboto', sans-serif;
  line-height: 1.4;
}

/* Botones */
.botones {
  margin-top: 50px;
}
.boton {
  display: inline-flex;
  align-items: center;
  padding: 18px 28px;
  background: linear-gradient(135deg, #003366, #00509e);
  color: #fff;
  text-decoration: none;
  border-radius: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  min-width: 240px;
  justify-content: center;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);
}
.boton:hover {
  background: linear-gradient(135deg, #00509e, #003366);
  transform: scale(1.05);
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.2);
}
.v-icon {
  margin-right: 10px;
  font-size: 30px;
}

/* Información adicional */
.informacion {
  margin-top: 60px;
}
.informacion-texto {
  font-size: 24px;
  color: #003366;
  font-weight: 600;
  line-height: 1.6;
  margin-top: 25px;
}

/* Responsive */
@media (max-width: 768px) {
  .titulo {
    font-size: 38px;
  }
  .subtitulo {
    font-size: 30px;
  }
  .descripcion {
    font-size: 18px;
  }
  .boton {
    width: 85%;
    margin-bottom: 20px;
    font-size: 16px;
  }
  .informacion-texto {
    font-size: 20px;
  }
}
</style>
