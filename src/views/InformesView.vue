<template>
    <v-row class="full-screen" align="center" justify="center">
      <!-- Encabezado -->
      <v-col cols="12" class="text-center">
        <h1 class="titulo">
          <v-icon large class="mr-2">mdi-account-group</v-icon>
          Análisis de Estudiantes
        </h1>
        <p class="descripcion">
          Consulta y analiza el rendimiento y la participación de tus alumnos.
        </p>
      </v-col>
  
      <!-- Botones de navegación para informes -->
      <v-row class="botones" justify="center" align="center">
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
      <v-row class="informacion" justify="center">
        <v-col cols="12" class="text-center">
          <p class="informacion-texto">
            Explora cada sección para obtener reportes detallados sobre el rendimiento académico, eventos importantes y listas de alumnos.
          </p>
        </v-col>
      </v-row>
    </v-row>
  </template>
  
  <script>
  export default {
    name: "GeneracionInformesView"
  };
  </script>
  
  <style scoped>
  .full-screen {
    min-height: 100vh;
    background-color: #eef2f7;
  }
  
  .titulo {
    font-size: 48px;
    font-weight: bold;
    color: #003366;
    margin-bottom: 10px;
  }
  
  .descripcion {
    font-size: 20px;
    color: #555;
    margin: 10px 0;
    font-weight: 300;
  }
  
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
  </style>
  