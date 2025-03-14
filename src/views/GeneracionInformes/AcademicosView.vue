<template>
  <div class="reportes-container">
    <!-- Encabezado -->
    <header class="reportes-header animated slideDown">
      <h1 class="title">
        <i class="mdi mdi-chart-bar pulse"></i>
        Reporte de Rendimiento Académico
      </h1>
      <p class="subtitle">
        Análisis global y detallado del desempeño de tus alumnos por curso.
      </p>
    </header>

    <!-- Controles: Búsqueda y exportación -->
    <div class="controls animated fadeIn">
      <div class="control-group">
        <i class="mdi mdi-magnify"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar curso..."
          class="search-input"
        />
      </div>
      <button @click="exportCSV" class="export-button animated bounceIn">
        <i class="mdi mdi-export"></i> Exportar CSV
      </button>
    </div>

    <!-- Indicador de carga -->
    <div v-if="loading" class="loader animated fadeIn">Cargando datos...</div>

    <!-- Mensaje de error -->
    <div v-if="error" class="error-message animated shake">{{ error }}</div>

    <!-- Contenido principal -->
    <div v-else>
      <!-- Resumen General -->
      <section class="summary animated fadeIn">
        <div class="summary-item" v-for="(item, index) in summaryItems" :key="index">
          <h2>
            <i class="mdi" :class="getSummaryIcon(index)"></i>
            {{ item.value }}
          </h2>
          <p>{{ item.label }}</p>
        </div>
      </section>

      <!-- Destacados de rendimiento -->
      <section class="highlights animated slideDown">
        <div class="highlight-item">
          <h3>
            <i class="mdi mdi-star"></i> Mejor Curso
          </h3>
          <p v-if="bestCourse">
            {{ bestCourse.courseName }} <span>({{ bestCourse.approval.toFixed(2) }}%)</span>
          </p>
          <p v-else>N/D</p>
        </div>
        <div class="highlight-item">
          <h3>
            <i class="mdi mdi-alert-circle"></i> Curso con Más Reprobados
          </h3>
          <p v-if="worstCourse">
            {{ worstCourse.courseName }} <span>({{ worstCourse.fail }} reprobados)</span>
          </p>
          <p v-else>N/D</p>
        </div>
      </section>

      <!-- Gráfico de Barras -->
      <section class="chart-container animated fadeInUp">
        <canvas id="chart"></canvas>
      </section>

      <!-- Tabla de Detalle por Curso -->
      <section class="detail-table-container animated fadeIn">
        <h2 class="table-title">
          <i class="mdi mdi-table"></i> Detalle por Curso
        </h2>
        <table class="detail-table">
          <thead>
            <tr>
              <th @click="sortBy('courseName')">Curso <i class="mdi mdi-swap-vertical"></i></th>
              <th @click="sortBy('totalStudents')">Alumnos Totales <i class="mdi mdi-swap-vertical"></i></th>
              <th @click="sortBy('pass')">Aprobados <i class="mdi mdi-swap-vertical"></i></th>
              <th @click="sortBy('fail')">Reprobados <i class="mdi mdi-swap-vertical"></i></th>
              <th @click="sortBy('approval')">% Aprobación <i class="mdi mdi-swap-vertical"></i></th>
              <th @click="sortBy('avgGrade')">Promedio General <i class="mdi mdi-swap-vertical"></i></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredReportData" :key="item.courseName">
              <td>{{ item.courseName }}</td>
              <td>{{ item.totalStudents }}</td>
              <td>{{ item.pass }}</td>
              <td>{{ item.fail }}</td>
              <td>{{ item.approval.toFixed(2) }}%</td>
              <td>{{ item.avgGrade.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { db, auth } from '@/services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Chart from 'chart.js/auto';

export default {
  name: 'ReportesAcademicos',
  setup() {
    const coursesData = ref([]);
    const reportData = ref([]);
    const loading = ref(true);
    const error = ref('');
    const searchQuery = ref('');
    const sortKey = ref('');
    const sortOrder = ref(1);

    const loadData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");

        const cursosRef = collection(db, 'cursos');
        const q = query(cursosRef, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        coursesData.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        reportData.value = coursesData.value.map(course => {
          let pass = 0, fail = 0, total = 0;
          let totalGrades = 0;
          if (course.alumnos && Array.isArray(course.alumnos)) {
            course.alumnos.forEach(alumno => {
              if (alumno.notas) {
                const notas = Object.values(alumno.notas)
                  .map(n => parseFloat(n))
                  .filter(n => !isNaN(n));
                if (notas.length > 0) {
                  total++;
                  const sum = notas.reduce((a, b) => a + b, 0);
                  const avg = sum / notas.length;
                  totalGrades += avg;
                  if (avg >= 10) pass++;
                  else fail++;
                }
              }
            });
          }
          const approval = total > 0 ? ((pass / total) * 100) : 0;
          const avgGrade = total > 0 ? (totalGrades / total) : 0;
          return {
            courseName: `${course.nombre} - ${course.seccion}`,
            pass,
            fail,
            totalStudents: total,
            approval,
            avgGrade
          };
        });

        renderChart(reportData.value);
      } catch (err) {
        console.error("Error cargando datos:", err);
        error.value = err.message || "Error al cargar los datos.";
      } finally {
        loading.value = false;
      }
    };

    // Estadísticas globales
    const totalCourses = computed(() => reportData.value.length);
    const totalStudents = computed(() =>
      reportData.value.reduce((sum, item) => sum + item.totalStudents, 0)
    );
    const totalApproved = computed(() =>
      reportData.value.reduce((sum, item) => sum + item.pass, 0)
    );
    const totalFailed = computed(() =>
      reportData.value.reduce((sum, item) => sum + item.fail, 0)
    );
    const overallApproval = computed(() => {
      const total = totalStudents.value;
      return total > 0
        ? ((totalApproved.value / total) * 100)
        : 0;
    });
    // Promedio global ponderado
    const overallAverageGrade = computed(() => {
      const total = totalStudents.value;
      const weightedSum = reportData.value.reduce((sum, item) => {
        return sum + (item.avgGrade * item.totalStudents);
      }, 0);
      return total > 0 ? weightedSum / total : 0;
    });

    // Destacados
    const bestCourse = computed(() => {
      if (!reportData.value.length) return null;
      return reportData.value.reduce((prev, current) =>
        current.approval > prev.approval ? current : prev
      );
    });
    const worstCourse = computed(() => {
      if (!reportData.value.length) return null;
      return reportData.value.reduce((prev, current) =>
        current.fail > prev.fail ? current : prev
      );
    });

    // Array para resumen general
    const summaryItems = computed(() => [
      { label: 'Cursos', value: totalCourses.value },
      { label: 'Alumnos Totales', value: totalStudents.value },
      { label: 'Aprobados', value: totalApproved.value },
      { label: 'Reprobados', value: totalFailed.value },
      { label: '% Aprobación', value: overallApproval.value.toFixed(2) + '%' },
      { label: 'Promedio Global', value: overallAverageGrade.value.toFixed(2) }
    ]);

    // Filtro de búsqueda y ordenamiento
    const filteredReportData = computed(() => {
      let data = [...reportData.value];
      if (searchQuery.value) {
        data = data.filter(item =>
          item.courseName.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
      }
      if (sortKey.value) {
        data.sort((a, b) => {
          if (a[sortKey.value] < b[sortKey.value]) return -1 * sortOrder.value;
          if (a[sortKey.value] > b[sortKey.value]) return 1 * sortOrder.value;
          return 0;
        });
      }
      return data;
    });
    const sortBy = (key) => {
      if (sortKey.value === key) {
        sortOrder.value = -sortOrder.value;
      } else {
        sortKey.value = key;
        sortOrder.value = 1;
      }
    };

    // Exporta los datos filtrados a CSV
    const exportCSV = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Curso,Alumnos Totales,Aprobados,Reprobados,% Aprobación,Promedio General\r\n";
      filteredReportData.value.forEach(item => {
        const row = [
          item.courseName,
          item.totalStudents,
          item.pass,
          item.fail,
          item.approval.toFixed(2),
          item.avgGrade.toFixed(2)
        ].join(",");
        csvContent += row + "\r\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "reporte_academico.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Renderiza el gráfico con animaciones
    const renderChart = (data) => {
      const labels = data.map(item => item.courseName);
      const passCounts = data.map(item => item.pass);
      const failCounts = data.map(item => item.fail);
      const ctx = document.getElementById('chart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Aprobados',
              data: passCounts,
              backgroundColor: 'rgba(75, 192, 192, 0.7)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            },
            {
              label: 'Reprobados',
              data: failCounts,
              backgroundColor: 'rgba(255, 99, 132, 0.7)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          animation: {
            duration: 1200,
            easing: 'easeOutQuart'
          },
          plugins: {
            title: {
              display: true,
              text: 'Reporte de Rendimiento Académico',
              font: { size: 18 }
            },
            tooltip: {
              callbacks: {
                label: context => {
                  const label = context.dataset.label || '';
                  return `${label}: ${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Número de Alumnos'
              }
            }
          }
        }
      });
    };

    // Función para asignar un ícono a cada resumen
    const getSummaryIcon = (index) => {
      const icons = [
        'mdi-school',          // Cursos
        'mdi-account-group',   // Alumnos Totales
        'mdi-checkbox-marked-circle', // Aprobados
        'mdi-close-circle',    // Reprobados
        'mdi-percent',         // % Aprobación
        'mdi-chart-line'       // Promedio Global
      ];
      return icons[index] || 'mdi-information';
    };

    onMounted(() => {
      loadData();
    });

    return {
      totalCourses,
      totalStudents,
      totalApproved,
      totalFailed,
      overallApproval,
      reportData,
      loading,
      error,
      searchQuery,
      sortBy,
      filteredReportData,
      bestCourse,
      worstCourse,
      exportCSV,
      summaryItems,
      getSummaryIcon
    };
  }
};
</script>

<style scoped>
/* Contenedor principal: uso completo del ancho y fondo neutro */
.reportes-container {
  width: 100%;
  padding: 30px 20px;
  background-color: #ffffff;
  animation: fadeIn 1s ease-out;
}

/* Encabezado */
.reportes-header {
  text-align: center;
  margin-bottom: 20px;
}
.title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #003366;
  margin: 0;
}
.subtitle {
  font-size: 1.5rem;
  color: #555;
  margin-top: 10px;
}

/* Controles */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  flex-wrap: wrap;
}
.control-group {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 250px;
  margin-right: 10px;
}
.control-group i {
  font-size: 1.5rem;
  color: #007acc;
  margin-right: 5px;
}
.search-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  transition: box-shadow 0.3s ease;
}
.search-input:focus {
  box-shadow: 0 0 5px rgba(0,122,204,0.5);
  outline: none;
}
.export-button {
  padding: 10px 20px;
  background-color: #007acc;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s;
  white-space: nowrap;
}
.export-button:hover {
  background-color: #005fa3;
  transform: scale(1.03);
}

/* Loader y mensajes de error */
.loader,
.error-message {
  text-align: center;
  font-size: 1.2rem;
  margin: 20px 0;
}

/* Resumen General */
.summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  margin-bottom: 30px;
}
.summary-item {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 10px;
  min-width: 150px;
  margin: 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}
.summary-item:hover {
  transform: translateY(-5px);
}
.summary-item h2 {
  font-size: 2rem;
  color: #007acc;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.summary-item p {
  font-size: 1rem;
  color: #555;
  margin: 0;
}

/* Destacados */
.highlights {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.highlight-item {
  background-color: #e0f7fa;
  padding: 15px;
  border-radius: 10px;
  min-width: 250px;
  margin: 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}
.highlight-item:hover {
  transform: scale(1.03);
}
.highlight-item h3 {
  font-size: 1.5rem;
  color: #007acc;
  margin-bottom: 5px;
}
.highlight-item p {
  font-size: 1rem;
  color: #555;
}

/* Gráfico */
.chart-container {
  margin-bottom: 40px;
}

/* Tabla de Detalle */
.detail-table-container {
  overflow-x: auto;
  margin-bottom: 20px;
}
.table-title {
  font-size: 1.75rem;
  color: #003366;
  margin-bottom: 10px;
  text-align: center;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
}
.detail-table th,
.detail-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
  transition: background-color 0.2s ease;
  cursor: pointer;
}
.detail-table th:hover,
.detail-table td:hover {
  background-color: #f9f9f9;
}
.detail-table th {
  background-color: #f0f0f0;
  font-weight: bold;
}

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Clases extra para animaciones de íconos */
.pulse {
  animation: pulseAnimation 2s infinite;
}
@keyframes pulseAnimation {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Responsividad */
@media (max-width: 600px) {
  .title { font-size: 2rem; }
  .subtitle { font-size: 1.2rem; }
  .control-group, .export-button { font-size: 0.9rem; }
  .summary-item h2 { font-size: 1.5rem; }
  .table-title { font-size: 1.5rem; }
}
</style>
