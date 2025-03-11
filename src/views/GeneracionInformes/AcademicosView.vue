<template>
  <div class="reportes-container">
    <!-- Encabezado -->
    <header class="reportes-header">
      <h1 class="title">
        <i class="mdi mdi-chart-bar"></i>
        Reporte de Rendimiento Académico
      </h1>
      <p class="subtitle">
        Análisis global y detallado del desempeño de tus alumnos por curso.
      </p>
    </header>

    <!-- Resumen General -->
    <section class="summary">
      <div class="summary-item">
        <h2>{{ totalCourses }}</h2>
        <p>Cursos</p>
      </div>
      <div class="summary-item">
        <h2>{{ totalStudents }}</h2>
        <p>Alumnos Totales</p>
      </div>
      <div class="summary-item">
        <h2>{{ totalApproved }}</h2>
        <p>Aprobados</p>
      </div>
      <div class="summary-item">
        <h2>{{ totalFailed }}</h2>
        <p>Reprobados</p>
      </div>
      <div class="summary-item">
        <h2>{{ overallApproval }}</h2>
        <p>% Aprobación</p>
      </div>
    </section>

    <!-- Gráfico de Barras -->
    <section class="chart-container">
      <canvas id="chart"></canvas>
    </section>

    <!-- Tabla de Detalle por Curso -->
    <section class="detail-table-container" v-if="reportData.length">
      <h2 class="table-title">Detalle por Curso</h2>
      <table class="detail-table">
        <thead>
          <tr>
            <th>Curso</th>
            <th>Alumnos Totales</th>
            <th>Aprobados</th>
            <th>Reprobados</th>
            <th>% Aprobación</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in reportData" :key="item.courseName">
            <td>{{ item.courseName }}</td>
            <td>{{ item.totalStudents }}</td>
            <td>{{ item.pass }}</td>
            <td>{{ item.fail }}</td>
            <td>{{ item.approval }}%</td>
          </tr>
        </tbody>
      </table>
    </section>
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

    const loadData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");

        // Consulta de cursos filtrados por usuario
        const cursosRef = collection(db, 'cursos');
        const q = query(cursosRef, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        coursesData.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Procesamos cada curso para obtener datos del reporte
        reportData.value = coursesData.value.map(course => {
          let pass = 0, fail = 0, total = 0;
          if (course.alumnos && Array.isArray(course.alumnos)) {
            course.alumnos.forEach(alumno => {
              if (alumno.notas) {
                const notas = Object.values(alumno.notas)
                  .map(n => parseFloat(n))
                  .filter(n => !isNaN(n));
                if (notas.length > 0) {
                  total++;
                  const avg = notas.reduce((a, b) => a + b, 0) / notas.length;
                  if (avg >= 10) pass++;
                  else fail++;
                }
              }
            });
          }
          const approval = total > 0 ? ((pass / total) * 100).toFixed(2) : "0.00";
          return {
            courseName: `${course.nombre} - ${course.seccion}`,
            pass,
            fail,
            totalStudents: total,
            approval
          };
        });

        renderChart(reportData.value);
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };

    // Estadísticas globales
    const totalCourses = computed(() => coursesData.value.length);
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
        ? ((totalApproved.value / total) * 100).toFixed(2) + '%'
        : 'N/A';
    });

    // Renderiza el gráfico usando Chart.js
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
          plugins: {
            title: {
              display: true,
              text: 'Reporte de Rendimiento Académico'
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

    onMounted(() => {
      loadData();
    });

    return {
      totalCourses,
      totalStudents,
      totalApproved,
      totalFailed,
      overallApproval,
      reportData
    };
  }
};
</script>

<style scoped>
.reportes-container {
  padding: 30px;
  max-width: 1000px;
  margin: 0 auto;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.reportes-header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 48px;
  font-weight: bold;
  color: #003366;
  margin: 0;
}

.subtitle {
  font-size: 22px;
  color: #555;
  margin-top: 10px;
}

.summary {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.summary-item {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 10px;
  width: 200px;
  margin: 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.summary-item h2 {
  font-size: 36px;
  color: #007acc;
  margin: 0;
}

.summary-item p {
  font-size: 18px;
  color: #555;
  margin: 0;
}

.chart-container {
  margin-bottom: 40px;
}

.detail-table-container {
  overflow-x: auto;
  margin-bottom: 20px;
}

.table-title {
  font-size: 28px;
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
}

.detail-table th {
  background-color: #f0f0f0;
  font-weight: bold;
}
</style>
