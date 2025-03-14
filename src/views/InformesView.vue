<template>
  <v-row class="full-screen" align="center" justify="center">
    <!-- Icono decorativo en la esquina superior derecha -->
    <div class="corner-icon">
      <v-img :src="customIcon" class="animated fadeIn" contain height="80" width="80" />
    </div>

    <!-- Encabezado -->
    <v-col cols="12" class="text-center header-container animated fadeIn">
      <h1 class="titulo">
        <v-icon large class="mr-2">mdi-account-group</v-icon>
        Reporte Integral de Estudiantes
      </h1>
      <p class="descripcion">
        Visualiza de manera detallada el rendimiento y la participación de tus alumnos para impulsar la excelencia académica.
      </p>
    </v-col>

    <!-- Botones de navegación para informes -->
    <v-row class="botones animated fadeInUp" justify="center" align="center">
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/generacion-informes/academicos" class="boton">
          <v-icon left>mdi-chart-bar</v-icon>
          Académicos
        </router-link>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/generacion-informes/eventos" class="boton">
          <v-icon left>mdi-calendar-clock</v-icon>
          Eventos
        </router-link>
      </v-col>
      <v-col cols="12" md="4" class="d-flex justify-center mb-3">
        <router-link to="/generacion-informes/listas" class="boton">
          <v-icon left>mdi-file-document-box</v-icon>
          Listas
        </router-link>
      </v-col>
    </v-row>

    <!-- Información adicional -->
    <v-row class="informacion animated fadeIn" justify="center">
      <v-col cols="12" class="text-center">
        <p class="informacion-texto">
          Explora cada sección para obtener reportes detallados y datos valiosos sobre el desempeño académico de tus estudiantes.
        </p>
      </v-col>
    </v-row>
  </v-row>
</template>

<script>
import customIcon from "@/Store/iciono.png";
export default {
  name: "GeneracionInformesView",
  data() {
    return {
      customIcon,
    };
  },
};
</script>

<style scoped>
/* Contenedor completo y fondo */
.full-screen {
  min-height: 100vh;
  background-color: #eef2f7;
  position: relative;
  padding: 20px;
}

/* Icono decorativo en la esquina superior derecha */
.corner-icon {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

/* Encabezado */
.header-container {
  margin-bottom: 40px;
}
.titulo {
  font-size: 48px;
  font-weight: bold;
  color: #003366;
  margin-bottom: 10px;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
}
.descripcion {
  font-size: 20px;
  color: #555;
  margin: 10px 0;
  font-weight: 300;
}

/* Botones de navegación */
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
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  min-width: 220px;
  justify-content: center;
}
.boton:hover {
  background: linear-gradient(135deg, #00509e, #003366);
  transform: scale(1.05);
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.2);
}
.v-icon {
  margin-right: 8px;
  font-size: 28px;
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

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animated {
  animation: fadeIn 0.8s ease-out both;
}
.fadeInUp {
  animation: fadeInUp 0.8s ease-out both;
}

/* Responsive */
@media (max-width: 768px) {
  .titulo {
    font-size: 36px;
  }
  .descripcion {
    font-size: 18px;
  }
  .boton {
    width: 80%;
    margin-bottom: 20px;
    font-size: 14px;
  }
  .informacion-texto {
    font-size: 20px;
  }
}
</style>
