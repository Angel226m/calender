<template>
    <div class="full-stats-container animated fadeIn">
      <header class="stats-header">
        <h1><i class="mdi mdi-chart-line"></i> Estadísticas Generales</h1>
      </header>
  
      <!-- Sección de Resumen -->
      <section class="summary-section">
        <div class="summary-item">
          <i class="mdi mdi-calendar-check"></i>
          <div>
            <h2>Total Eventos</h2>
            <p>{{ totalEvents }}</p>
          </div>
        </div>
        <div class="summary-item">
          <i class="mdi mdi-school"></i>
          <div>
            <h2>Total Cursos</h2>
            <p>{{ totalCourses }}</p>
          </div>
        </div>
        <div class="summary-item">
          <i class="mdi mdi-chart-bar"></i>
          <div>
            <h2>Promedio Eventos/Día</h2>
            <p>{{ averageEventsPerDay }}</p>
          </div>
        </div>
        <div class="summary-item">
          <i class="mdi mdi-alert"></i>
          <div>
            <h2>Día con Más Eventos</h2>
            <p>{{ dayWithMaxEvents.date }} ({{ dayWithMaxEvents.count }})</p>
          </div>
        </div>
        <div class="summary-item">
          <i class="mdi mdi-timer-sand"></i>
          <div>
            <h2>Duración Total (hrs)</h2>
            <p>{{ totalDuration }}</p>
          </div>
        </div>
        <div class="summary-item">
          <i class="mdi mdi-clock-outline"></i>
          <div>
            <h2>Promedio Duración/Día (hrs)</h2>
            <p>{{ averageDuration }}</p>
          </div>
        </div>
      </section>
  
      <!-- Sección de Gráficos -->
      <section class="charts-section">
        <div class="chart-container">
          <h2><i class="mdi mdi-calendar"></i> Eventos por Día</h2>
          <canvas id="eventsChart"></canvas>
        </div>
        <div class="chart-container">
          <h2><i class="mdi mdi-timer"></i> Duración de Eventos por Día</h2>
          <canvas id="durationChart"></canvas>
        </div>
        <div class="chart-container">
          <h2><i class="mdi mdi-school"></i> Cursos por Día de la Semana</h2>
          <canvas id="coursesChart"></canvas>
        </div>
      </section>
  
      <!-- Sección de Recomendaciones -->
      <section class="recommendations" v-if="allRecommendations.length">
        <h2><i class="mdi mdi-lightbulb-on-outline"></i> Recomendaciones</h2>
        <ul>
          <li v-for="(rec, index) in allRecommendations" :key="index">
            {{ rec }}
          </li>
        </ul>
      </section>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { db, auth } from '@/services/firebase';
  import { collection, getDocs, query, where } from 'firebase/firestore';
  import Chart from 'chart.js/auto';
  
  /* ─── CARGA DE DATOS ───────────────────────────────────────────── */
  // Se cargan los eventos y cursos del usuario
  const events = ref([]);
  const courses = ref([]);
  
  const loadEvents = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");
      const q = query(collection(db, "eventos"), where("userId", "==", currentUser.uid));
      const snapshot = await getDocs(q);
      events.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };
  
  const loadCourses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");
      const q = query(collection(db, "cursos"), where("userId", "==", currentUser.uid));
      const snapshot = await getDocs(q);
      courses.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  };
  
  onMounted(async () => {
    await loadEvents();
    await loadCourses();
  });
  
  /* ─── AGREGACIÓN Y CÁLCULOS ───────────────────────────────────── */
  // Eventos por día (se asume que evt.start tiene formato "YYYY-MM-DD")
  const eventsCountByDay = computed(() => {
    const counts = {};
    events.value.forEach(evt => {
      const date = evt.start;
      counts[date] = (counts[date] || 0) + 1;
    });
    return counts;
  });
  
  const dailyEventsData = computed(() => {
    const counts = eventsCountByDay.value;
    const dataArr = Object.keys(counts).map(date => ({ date, count: counts[date] }));
    dataArr.sort((a, b) => new Date(a.date) - new Date(b.date));
    return dataArr;
  });
  
  const totalEvents = computed(() => events.value.length);
  const averageEventsPerDay = computed(() => {
    const data = dailyEventsData.value;
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.count, 0);
    return (total / data.length).toFixed(2);
  });
  const dayWithMaxEvents = computed(() => {
    const data = dailyEventsData.value;
    if (data.length === 0) return { date: "N/A", count: 0 };
    return data.reduce((prev, curr) => curr.count > prev.count ? curr : prev);
  });
  
  // Duración de eventos por día (si evt.time y evt.end están definidos)
  // Función auxiliar para convertir "HH:MM" a minutos
  const toMinutes = timeStr => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };
  
  const dailyEventDurations = computed(() => {
    const durations = {};
    events.value.forEach(evt => {
      if (evt.start && evt.time && evt.end) {
        const startMin = toMinutes(evt.time);
        const endMin = toMinutes(evt.end);
        if (endMin > startMin) {
          durations[evt.start] = (durations[evt.start] || 0) + (endMin - startMin);
        }
      }
    });
    return durations;
  });
  const dailyEventDurationsData = computed(() => {
    const durations = dailyEventDurations.value;
    const dataArr = Object.keys(durations).map(date => ({
      date,
      duration: (durations[date] / 60).toFixed(2) // en horas
    }));
    dataArr.sort((a, b) => new Date(a.date) - new Date(b.date));
    return dataArr;
  });
  const totalDuration = computed(() => {
    const data = dailyEventDurationsData.value;
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + parseFloat(item.duration), 0);
    return total.toFixed(2);
  });
  const averageDuration = computed(() => {
    const data = dailyEventDurationsData.value;
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + parseFloat(item.duration), 0);
    return (total / data.length).toFixed(2);
  });
  
  // Cursos por día de la semana (se asume que curso.dia es "Domingo", "Lunes", etc.)
  const weekDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const coursesCountByDayOfWeek = computed(() => {
    const counts = {};
    weekDays.forEach(day => counts[day] = 0);
    courses.value.forEach(curso => {
      if (curso.dia && Object.prototype.hasOwnProperty.call(counts, curso.dia)) {
        counts[curso.dia] += 1;
      }
    });
    return counts;
  });
  const coursesByWeekDayData = computed(() => {
    const counts = coursesCountByDayOfWeek.value;
    return weekDays.map(day => ({ day, count: counts[day] }));
  });
  const totalCourses = computed(() => courses.value.length);
  
  // Recomendaciones basadas en cantidad de eventos y duración
  const recommendations = computed(() => {
    const recs = [];
    dailyEventsData.value.forEach(item => {
      if (item.count > 5) {
        recs.push(`El día ${item.date} tiene ${item.count} eventos. Considera distribuirlos mejor.`);
      }
    });
    dailyEventDurationsData.value.forEach(item => {
      if (parseFloat(item.duration) > 8) {
        recs.push(`El día ${item.date} tiene ${item.duration} hrs de eventos. Considera reducir la carga.`);
      }
    });
    return recs;
  });
  const allRecommendations = computed(() => recommendations.value);
  
  /* ─── RENDERIZACIÓN DE GRÁFICOS ───────────────────────────────── */
  // Gráfico de Eventos por Día (Bar Chart)
  let eventsChartInstance = null;
  const renderEventsChart = () => {
    const ctx = document.getElementById('eventsChart').getContext('2d');
    const labels = dailyEventsData.value.map(item => item.date);
    const dataCounts = dailyEventsData.value.map(item => item.count);
    if (eventsChartInstance) eventsChartInstance.destroy();
    eventsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Eventos por Día',
          data: dataCounts,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 1200, easing: 'easeOutBounce' },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Cantidad de Eventos' }
          }
        }
      }
    });
  };
  
  // Gráfico de Duración de Eventos por Día (Line Chart)
  let durationChartInstance = null;
  const renderDurationChart = () => {
    const ctx = document.getElementById('durationChart').getContext('2d');
    const labels = dailyEventDurationsData.value.map(item => item.date);
    const durations = dailyEventDurationsData.value.map(item => item.duration);
    if (durationChartInstance) durationChartInstance.destroy();
    durationChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Duración de Eventos (hrs)',
          data: durations,
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 1200, easing: 'easeOutBounce' },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Horas' }
          }
        }
      }
    });
  };
  
  // Gráfico de Cursos por Día de la Semana (Doughnut Chart)
  let coursesChartInstance = null;
  const renderCoursesChart = () => {
    const ctx = document.getElementById('coursesChart').getContext('2d');
    const labels = coursesByWeekDayData.value.map(item => item.day);
    const dataCounts = coursesByWeekDayData.value.map(item => item.count);
    if (coursesChartInstance) coursesChartInstance.destroy();
    coursesChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label: 'Cursos por Día',
          data: dataCounts,
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(159, 159, 159, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 1200, easing: 'easeOutBounce' }
      }
    });
  };
  
  watch(dailyEventsData, renderEventsChart);
  watch(dailyEventDurationsData, renderDurationChart);
  watch(coursesByWeekDayData, renderCoursesChart);
  
  onMounted(() => {
    renderEventsChart();
    renderDurationChart();
    renderCoursesChart();
  });
  </script>
  
  <style scoped>
  .full-stats-container {
    width: 100%;
    padding: 20px;
    background-color: #fff;
    animation: fadeIn 1s ease-out;
  }
  
  .stats-header {
    text-align: center;
    margin-bottom: 20px;
  }
  .stats-header h1 {
    font-size: 2.2rem;
    color: #003366;
  }
  
  .summary-section {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    margin-bottom: 30px;
  }
  .summary-item {
    background-color: #f0f0f0;
    padding: 15px;
    margin: 10px;
    border-radius: 8px;
    flex: 1;
    min-width: 180px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.3s;
  }
  .summary-item:hover {
    transform: scale(1.03);
  }
  .summary-item i {
    font-size: 2rem;
    color: #007acc;
  }
  .summary-item h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #333;
  }
  .summary-item p {
    margin: 0;
    font-size: 1.5rem;
    font-weight: bold;
    color: #007acc;
  }
  
  .charts-section {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    gap: 20px;
  }
  .chart-container {
    flex: 1;
    min-width: 300px;
    max-width: 600px;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    animation: fadeIn 1s ease-out;
  }
  .chart-container h2 {
    text-align: center;
    font-size: 1.5rem;
    margin-bottom: 10px;
    color: #003366;
  }
  
  .recommendations {
    margin-top: 20px;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    padding: 15px;
    border-radius: 8px;
  }
  .recommendations h2 {
    text-align: center;
    font-size: 1.5rem;
    color: #856404;
    margin-bottom: 10px;
  }
  .recommendations ul {
    list-style: none;
    padding: 0;
  }
  .recommendations li {
    margin: 5px 0;
    font-size: 1rem;
    color: #856404;
  }
  
  /* Animación simple */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  </style>
  