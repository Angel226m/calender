<template>
    <div class="dashboard">
      <!-- Encabezado -->
      <header class="dashboard-header animated fadeInDown">
        <h1>
          <i class="mdi mdi-chart-line"></i> Dashboard de Asistencia
        </h1>
        <p class="dashboard-subtitle">
          Análisis integral de la asistencia y faltas de tus alumnos.
        </p>
      </header>
  
      <!-- Filtros -->
      <section class="filters-section animated fadeIn">
        <div class="filter-group">
          <i class="mdi mdi-magnify"></i>
          <input
            v-model="busqueda"
            placeholder="Buscar por nombre..."
            @keyup.enter="filtrarDatos"
          />
        </div>
        <div class="filter-group">
          <i class="mdi mdi-calendar"></i>
          <input type="date" v-model="fechaFiltro" />
        </div>
        <div class="filter-group">
          <i class="mdi mdi-book-open-page-variant"></i>
          <select v-model="cursoFiltro">
            <option value="">Selecciona Curso</option>
            <option v-for="curso in cursos" :key="curso.id" :value="curso.id">
              {{ curso.nombre }} - {{ curso.seccion }}
            </option>
          </select>
        </div>
        <button @click="exportarExcel" class="export-btn animated pulse">
          <i class="mdi mdi-file-excel"></i> Exportar Excel
        </button>
        <!-- Icono de refrescar para actualizar gráficos -->
        <button @click="actualizarGraficos" class="refresh-btn animated bounce">
          <i class="mdi mdi-refresh"></i>
        </button>
      </section>
  
      <!-- Sección de Gráficos -->
      <section class="charts-section">
        <!-- Gráfico de Barras: Alumnos con más faltas -->
        <div class="chart-card animated fadeInUp hover-scale">
          <h2>
            <i class="mdi mdi-chart-bar"></i> Top Faltas
          </h2>
          <canvas id="faltasChart"></canvas>
          <p class="chart-description">
            Alumnos con mayor cantidad de ausencias.
          </p>
        </div>
  
        <!-- Gráfico de Pastel: Distribución de estados -->
        <div class="chart-card animated fadeInUp hover-scale">
          <h2>
            <i class="mdi mdi-chart-pie"></i> Distribución de Asistencias
          </h2>
          <canvas id="distributionChart"></canvas>
          <p class="chart-description">
            Proporción de estados: Presente, Ausente y Justificada.
          </p>
        </div>
  
        <!-- Gráfico de Línea: Tendencia de asistencia -->
        <div class="chart-card animated fadeInUp hover-scale">
          <h2>
            <i class="mdi mdi-trending-up"></i> Tendencia de Asistencia
          </h2>
          <canvas id="trendChart"></canvas>
          <p class="chart-description">
            Evolución de la asistencia a lo largo del tiempo.
          </p>
        </div>
      </section>
  
      <!-- Reporte Detallado -->
      <section class="report-section animated fadeInUp">
        <h2>
          <i class="mdi mdi-format-list-bulleted"></i> Listado Detallado
        </h2>
        <table class="report-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Presente</th>
              <th>Ausente</th>
              <th>Justificada</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alumno in listadoAlumnos" :key="alumno.dni">
              <td>{{ alumno.nombre }} {{ alumno.apellido }}</td>
              <td>{{ alumno.presente }}</td>
              <td>{{ alumno.ausente }}</td>
              <td>{{ alumno.justificada }}</td>
            </tr>
          </tbody>
        </table>
      </section>
  
      <!-- Mensaje de Error -->
      <p v-if="mensajeError" class="error-message animated shake">
        {{ mensajeError }}
      </p>
    </div>
  </template>
  
  <script>
  import { db, auth } from "@/services/firebase";
  import { collection, getDocs, query, where } from "firebase/firestore";
  import * as XLSX from "xlsx";
  import Chart from "chart.js/auto";
  
  export default {
    name: "DashboardAsistencia",
    data() {
      return {
        busqueda: "",
        fechaFiltro: "",
        cursoFiltro: "",
        cursos: [],
        // Cada registro de asistencia tiene: { id, cursoId, nombre, dni, fecha, estado, userId }
        asistencias: [],
        mensajeError: "",
        chartFaltas: null,
        chartDistribution: null,
        chartTrend: null,
      };
    },
    computed: {
      // Registros filtrados según búsqueda, fecha y curso
      asistenciasFiltradas() {
        return this.asistencias
          .filter(a =>
            a.nombre.toLowerCase().includes(this.busqueda.toLowerCase())
          )
          .filter(a => (this.fechaFiltro ? a.fecha === this.fechaFiltro : true))
          .filter(a => (this.cursoFiltro ? a.cursoId === this.cursoFiltro : true));
      },
      // Alumnos con más faltas (estado "Ausente")
      alumnosConMasFaltas() {
        if (!this.cursoFiltro) return [];
        const curso = this.cursos.find(c => c.id === this.cursoFiltro);
        if (!curso || !curso.alumnos) return [];
        let alumnosFaltas = curso.alumnos.map(alumno => {
          const faltas = this.asistenciasFiltradas.filter(
            a => a.dni === alumno.dni && a.estado === "Ausente"
          ).length;
          return { ...alumno, faltas };
        });
        return alumnosFaltas
          .sort((a, b) => b.faltas - a.faltas)
          .filter(a => a.faltas > 0);
      },
      // Datos para el gráfico de pastel: distribución de estados
      distributionData() {
        const present = this.asistenciasFiltradas.filter(
          a => a.estado === "Presente"
        ).length;
        const absent = this.asistenciasFiltradas.filter(
          a => a.estado === "Ausente"
        ).length;
        const justified = this.asistenciasFiltradas.filter(
          a => a.estado === "Justificada"
        ).length;
        return { present, absent, justified };
      },
      // Datos para el gráfico de línea: tendencia por fecha
      attendanceTrend() {
        const trend = {};
        this.asistenciasFiltradas.forEach(a => {
          if (!trend[a.fecha]) {
            trend[a.fecha] = { present: 0, absent: 0, justified: 0 };
          }
          if (a.estado === "Presente") trend[a.fecha].present += 1;
          else if (a.estado === "Ausente") trend[a.fecha].absent += 1;
          else if (a.estado === "Justificada") trend[a.fecha].justified += 1;
        });
        const sortedDates = Object.keys(trend).sort();
        return {
          dates: sortedDates,
          present: sortedDates.map(date => trend[date].present),
          absent: sortedDates.map(date => trend[date].absent),
          justified: sortedDates.map(date => trend[date].justified),
        };
      },
      // Listado detallado por alumno
      listadoAlumnos() {
        if (!this.cursoFiltro) return [];
        const curso = this.cursos.find(c => c.id === this.cursoFiltro);
        if (!curso || !curso.alumnos) return [];
        return curso.alumnos.map(alumno => {
          const presente = this.asistenciasFiltradas.filter(
            a => a.dni === alumno.dni && a.estado === "Presente"
          ).length;
          const ausente = this.asistenciasFiltradas.filter(
            a => a.dni === alumno.dni && a.estado === "Ausente"
          ).length;
          const justificada = this.asistenciasFiltradas.filter(
            a => a.dni === alumno.dni && a.estado === "Justificada"
          ).length;
          return { ...alumno, presente, ausente, justificada };
        });
      },
    },
    async mounted() {
      await this.cargarCursos();
      await this.cargarAsistencias();
      this.iniciarGraficos();
    },
    methods: {
      async cargarCursos() {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) throw new Error("Usuario no autenticado");
          const cursosRef = collection(db, "cursos");
          const q = query(cursosRef, where("userId", "==", currentUser.uid));
          const snapshot = await getDocs(q);
          this.cursos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
          console.error("Error al cargar los cursos:", error);
        }
      },
      async cargarAsistencias() {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) throw new Error("Usuario no autenticado");
          const asistenciasRef = collection(db, "asistencias");
          const q = query(asistenciasRef, where("userId", "==", currentUser.uid));
          const snapshot = await getDocs(q);
          this.asistencias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
          console.error("Error al cargar las asistencias:", error);
        }
      },
      filtrarDatos() {
        if (!this.busqueda.trim()) {
          this.mensajeError = "⚠️ Ingresa un término de búsqueda.";
          setTimeout(() => (this.mensajeError = ""), 2000);
        }
        this.actualizarGraficos();
      },
      exportarExcel() {
        const datos = this.asistenciasFiltradas.map(a => ({
          Nombre: a.nombre,
          Fecha: this.formatearFecha(a.fecha),
          Estado: a.estado,
        }));
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
        XLSX.writeFile(wb, "asistencias.xlsx");
      },
      formatearFecha(fecha) {
        if (typeof fecha === "string" && fecha.includes("-")) {
          const parts = fecha.split("-");
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        const d = new Date(fecha);
        const dia = d.getDate().toString().padStart(2, "0");
        const mes = (d.getMonth() + 1).toString().padStart(2, "0");
        const anio = d.getFullYear();
        return `${dia}/${mes}/${anio}`;
      },
      // Inicializa los tres gráficos
      iniciarGraficos() {
        this.$nextTick(() => {
          this.iniciarGraficoFaltas();
          this.iniciarGraficoDistribution();
          this.iniciarGraficoTrend();
        });
      },
      iniciarGraficoFaltas() {
        const ctx = document.getElementById("faltasChart").getContext("2d");
        if (this.chartFaltas) this.chartFaltas.destroy();
        this.chartFaltas = new Chart(ctx, {
          type: "bar",
          data: {
            labels: this.alumnosConMasFaltas.map(a => `${a.nombre} ${a.apellido}`),
            datasets: [
              {
                label: "Faltas",
                data: this.alumnosConMasFaltas.map(a => a.faltas),
                backgroundColor: "rgba(255, 99, 132, 0.6)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { precision: 0 },
              },
            },
          },
        });
      },
      iniciarGraficoDistribution() {
        const ctx = document.getElementById("distributionChart").getContext("2d");
        if (this.chartDistribution) this.chartDistribution.destroy();
        const dist = this.distributionData;
        this.chartDistribution = new Chart(ctx, {
          type: "pie",
          data: {
            labels: ["Presente", "Ausente", "Justificada"],
            datasets: [
              {
                data: [dist.present, dist.absent, dist.justified],
                backgroundColor: [
                  "rgba(46, 204, 113, 0.6)",
                  "rgba(231, 76, 60, 0.6)",
                  "rgba(52, 152, 219, 0.6)",
                ],
                borderColor: [
                  "rgba(46, 204, 113, 1)",
                  "rgba(231, 76, 60, 1)",
                  "rgba(52, 152, 219, 1)",
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
          },
        });
      },
      iniciarGraficoTrend() {
        const ctx = document.getElementById("trendChart").getContext("2d");
        if (this.chartTrend) this.chartTrend.destroy();
        const trend = this.attendanceTrend;
        this.chartTrend = new Chart(ctx, {
          type: "line",
          data: {
            labels: trend.dates,
            datasets: [
              {
                label: "Presente",
                data: trend.present,
                borderColor: "rgba(46, 204, 113, 1)",
                backgroundColor: "rgba(46, 204, 113, 0.2)",
                fill: true,
              },
              {
                label: "Ausente",
                data: trend.absent,
                borderColor: "rgba(231, 76, 60, 1)",
                backgroundColor: "rgba(231, 76, 60, 0.2)",
                fill: true,
              },
              {
                label: "Justificada",
                data: trend.justified,
                borderColor: "rgba(52, 152, 219, 1)",
                backgroundColor: "rgba(52, 152, 219, 0.2)",
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { precision: 0 },
              },
            },
          },
        });
      },
      actualizarGraficos() {
        this.iniciarGraficos();
      },
    },
    watch: {
      busqueda() {
        this.actualizarGraficos();
      },
      fechaFiltro() {
        this.actualizarGraficos();
      },
      cursoFiltro() {
        this.actualizarGraficos();
      },
    },
  };
  </script>
  
  <style scoped>
  /* Contenedor principal simplificado */
  .dashboard {
    padding: 20px;
    background: #f0f4f8;
    min-height: 100vh;
    box-sizing: border-box;
  }
  
  /* Encabezado */
  .dashboard-header {
    text-align: center;
    margin-bottom: 20px;
  }
  .dashboard-header h1 {
    font-size: 2.2rem;
    color: #2c3e50;
  }
  .dashboard-subtitle {
    font-size: 1rem;
    color: #7f8c8d;
  }
  
  /* Filtros */
  .filters-section {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-bottom: 30px;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .filter-group input,
  .filter-group select {
    padding: 8px;
    font-size: 0.9rem;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
  }
  .export-btn, .refresh-btn {
    background: #27ae60;
    color: #fff;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .export-btn i, .refresh-btn i {
    font-size: 1.2rem;
  }
  
  /* Gráficos y reportes */
  .charts-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }
  .chart-card {
    background: #fff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    text-align: center;
    transition: transform 0.3s ease;
  }
  .chart-card h2 {
    font-size: 1.3rem;
    margin-bottom: 10px;
    color: #34495e;
  }
  .chart-description {
    margin-top: 8px;
    font-size: 0.85rem;
    color: #7f8c8d;
  }
  
  /* Reporte Detallado */
  .report-section {
    background: #fff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .report-section h2 {
    text-align: center;
    margin-bottom: 10px;
    color: #34495e;
  }
  .report-table {
    width: 100%;
    border-collapse: collapse;
  }
  .report-table th,
  .report-table td {
    padding: 10px;
    border: 1px solid #ecf0f1;
    text-align: center;
  }
  .report-table th {
    background: #3498db;
    color: #fff;
  }
  
  /* Mensaje de Error */
  .error-message {
    text-align: center;
    color: #e74c3c;
    font-weight: bold;
    margin-top: 15px;
  }
  
  /* Animación al pasar el cursor */
  .hover-scale:hover {
    transform: scale(1.03);
  }
  
  /* Media queries para móvil */
  @media (max-width: 600px) {
    .dashboard-header h1 {
      font-size: 1.8rem;
    }
    .dashboard-subtitle {
      font-size: 0.9rem;
    }
    .filter-group input,
    .filter-group select {
      font-size: 0.8rem;
      padding: 6px;
    }
    .export-btn, .refresh-btn {
      padding: 6px 10px;
      font-size: 0.8rem;
    }
    .chart-card h2 {
      font-size: 1.2rem;
    }
  }
  </style>
  