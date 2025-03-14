<template>
  <div>
    <!-- Encabezado -->
    <div class="header animated fadeIn">
      <h1>📅 Calendario de Eventos</h1>
      <div class="actions">
        <button class="add-event-btn animated bounceIn" @click="openModal()">
          ➕ Agregar Evento
        </button>
        <input
          type="file"
          class="file-input"
          @change="handleFileUpload"
          accept=".xlsx, .xls"
        />
      </div>
    </div>

    <!-- Calendario -->
    <FullCalendar
      ref="calendarRef"
      class="custom-calendar animated fadeIn"
      :options="calendarOptions"
    />

    <!-- Modal para agregar/editar evento manual -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content" style="max-height: 80vh; overflow-y: auto;" @click.stop>
        <h2 class="modal-title">
          {{ isEditing ? "Editar Evento" : "Agregar Evento" }}
        </h2>
        <!-- Campo para título (obligatorio) -->
        <div class="field">
          <label for="event-title">Título del evento:</label>
          <input id="event-title" v-model="newEvent.title" placeholder="Título del evento (obligatorio)" />
        </div>
        <!-- Campo para seleccionar fecha -->
        <div class="field">
          <label for="event-date">Fecha:</label>
          <input id="event-date" v-model="newEvent.start" type="date" :min="minDate" required />
        </div>
        <!-- Campo para seleccionar hora de inicio -->
        <div class="field">
          <label for="event-start">Hora de inicio:</label>
          <input id="event-start" v-model="newEvent.time" type="time" required />
        </div>
        <!-- Campo para seleccionar hora de fin -->
        <div class="field">
          <label for="event-end">Hora de fin:</label>
          <input id="event-end" v-model="newEvent.end" type="time" required />
        </div>
        <!-- Selección de curso (opcional) -->
        <div class="field">
          <label for="event-course">Curso:</label>
          <select id="event-course" v-model="newEvent.courseId">
            <option disabled value="">Seleccionar Curso (opcional)</option>
            <option v-for="curso in courses" :key="curso.id" :value="curso.id">
              {{ curso.nombre }} - {{ curso.seccion }}
            </option>
          </select>
        </div>

        <!-- Mostrar eventos programados para la fecha seleccionada -->
        <div v-if="scheduledManualEvents.length || scheduledCourseEvents.length" class="scheduled-events animated slideInUp">
          <h3>Programación para este día:</h3>
          <div v-if="scheduledManualEvents.length">
            <h4>Eventos del día:</h4>
            <ul>
              <li v-for="evt in scheduledManualEvents" :key="evt.id">
                {{ evt.title }} - {{ evt.time }}
                <span v-if="evt.end"> a {{ evt.end.split('T')[1] }}</span>
              </li>
            </ul>
          </div>
          <div v-if="scheduledCourseEvents.length">
            <h4>Cursos del día:</h4>
            <ul>
              <li v-for="evt in scheduledCourseEvents" :key="evt.id">
                {{ evt.title }} - {{ evt.time }}
                <span v-if="evt.end"> a {{ evt.end.split('T')[1] }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="modal-buttons">
          <button class="save-btn" @click="saveEvent">💾 Guardar</button>
          <button v-if="isEditing" class="delete-btn" @click="openDeleteConfirm">
            🗑️ Eliminar
          </button>
          <button class="cancel-btn" @click="closeModal">❌ Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación para eliminación -->
    <div v-if="showDeleteConfirm" class="modal-overlay animated popIn" @click="closeDeleteConfirm">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">Confirmación de Eliminación</h2>
        <p>¿Estás seguro de que deseas eliminar este evento?</p>
        <div class="modal-buttons">
          <button class="delete-btn" @click="confirmDelete">Sí, eliminar</button>
          <button class="cancel-btn" @click="closeDeleteConfirm">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación por conflicto de horario -->
    <div v-if="showConflictConfirm" class="modal-overlay animated popIn" @click="cancelConflict">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">Conflicto de Horario</h2>
        <p>Ya existe un evento o curso que se cruza en el mismo intervalo. ¿Estás seguro de que deseas continuar?</p>
        <div class="modal-buttons">
          <button class="save-btn" @click="confirmConflict">Continuar</button>
          <button class="cancel-btn" @click="cancelConflict">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Notificación (errores, avisos, etc.) -->
    <div v-if="showMessageModal" class="modal-overlay animated popIn" @click="closeMessageModal">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">{{ messageTitle }}</h2>
        <p>{{ messageContent }}</p>
        <div class="modal-buttons">
          <button class="cancel-btn" @click="closeMessageModal">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineExpose } from "vue";
import FullCalendar from "@fullcalendar/vue";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import * as XLSX from "xlsx";
import { db, auth } from "@/services/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

// Función para obtener la fecha de hoy (formato ISO: YYYY-MM-DD)
const getToday = () => new Date().toISOString().split("T")[0];
const defaultDate = computed(() => getToday());
const minDate = computed(() => defaultDate.value);

const isLoading = ref(false);
const errorMsg = ref("");

const manualEvents = ref([]);
const courses = ref([]);

// Mapeo de días para cursos
const diasSemana = {
  "Domingo": 0,
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5,
  "Sábado": 6,
};

// Combina eventos manuales y de cursos
const events = computed(() => {
  const manual = manualEvents.value.map(e => {
    const eventObj = { ...e, start: e.start + "T" + e.time };
    if (e.end) eventObj.end = e.start + "T" + e.end;
    return eventObj;
  });
  const courseEvents = courses.value.map(curso => {
    const targetDay = diasSemana[curso.dia];
    if (targetDay === undefined) return null;
    return {
      id: `curso-${curso.id}`,
      title: `${curso.nombre} - ${curso.seccion}`,
      daysOfWeek: [targetDay],
      time: curso.hora,
      startTime: curso.hora,
      startRecur: curso.fechaInicio,
      endRecur: curso.fechaFin,
      course: curso.nombre
    };
  }).filter(evt => evt !== null);
  return [...manual, ...courseEvents];
});

const showModal = ref(false);
const isEditing = ref(false);
const newEvent = ref({ id: null, title: "", start: "", time: "", end: "", courseId: "" });
const calendarRef = ref(null);

const openModal = (evt = null) => {
  if (evt) {
    isEditing.value = true;
    newEvent.value = { ...evt };
  } else {
    isEditing.value = false;
    const now = new Date();
    newEvent.value = {
      id: null,
      title: "",
      start: defaultDate.value,
      time: now.toTimeString().substring(0, 5),
      end: now.toTimeString().substring(0, 5),
      courseId: ""
    };
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  newEvent.value = { id: null, title: "", start: "", time: "", end: "", courseId: "" };
};

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  locale: "es",
  timeZone: "America/Lima",
  editable: false,
  selectable: true,
  events: events.value,
  eventDidMount: info => {
    if (info.event.id && !info.event.id.startsWith("curso-")) {
      info.el.style.backgroundColor = "#cceeff";
      info.el.style.border = "2px solid #007acc";
      info.el.style.color = "#003366";
    }
  },
  eventClick: handleEventClick
}));

watch(
  events,
  () => {
    if (calendarRef.value) {
      calendarRef.value.getApi().refetchEvents();
    }
  },
  { deep: true }
);

// Computed para eventos programados en la fecha seleccionada
const scheduledEvents = computed(() => {
  if (!newEvent.value.start) return [];
  const selectedDate = new Date(newEvent.value.start + "T00:00:00");
  return events.value.filter(evt => {
    if (evt.daysOfWeek === undefined) {
      return evt.start.split("T")[0] === newEvent.value.start;
    }
    const startRecur = new Date(evt.startRecur + "T00:00:00");
    const endRecur = new Date(evt.endRecur + "T00:00:00");
    return selectedDate >= startRecur &&
           selectedDate <= endRecur &&
           evt.daysOfWeek.includes(selectedDate.getDay());
  });
});

const scheduledManualEvents = computed(() =>
  scheduledEvents.value.filter(evt => evt.daysOfWeek === undefined)
);
const scheduledCourseEvents = computed(() =>
  scheduledEvents.value.filter(evt => evt.daysOfWeek !== undefined)
);

// Convierte "HH:MM" a minutos
const toMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const showMessageModal = ref(false);
const messageTitle = ref("");
const messageContent = ref("");
const showMessage = (title, content) => {
  messageTitle.value = title;
  messageContent.value = content;
  showMessageModal.value = true;
};
const closeMessageModal = () => {
  showMessageModal.value = false;
  messageTitle.value = "";
  messageContent.value = "";
};

const showDeleteConfirm = ref(false);
const openDeleteConfirm = () => { showDeleteConfirm.value = true; };
const closeDeleteConfirm = () => { showDeleteConfirm.value = false; };

const showConflictConfirm = ref(false);
const confirmConflict = async () => {
  showConflictConfirm.value = false;
  await proceedSaveEvent();
};
const cancelConflict = () => { showConflictConfirm.value = false; };

// Función para enviar notificación por email
const enviarNotificacionEmail = async (evento) => {
  try {
    const email = auth.currentUser ? auth.currentUser.email : "";
    if (!email) return; // Si no hay correo, no se envía notificación.
    const subject = `Recordatorio: Nuevo Evento "${evento.title}"`;
    const text = `Se ha creado el evento "${evento.title}" para el ${evento.start} a las ${evento.time}.`;
    const html = `<p>Se ha creado el evento <strong>${evento.title}</strong> para el <strong>${evento.start}</strong> a las <strong>${evento.time}</strong>.</p>`;
    const response = await fetch("http://localhost:3000/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, text, html }),
    });
    const result = await response.json();
    if (!result.success) {
      console.error("Error enviando notificación:", result.error);
    }
  } catch (err) {
    console.error("Error en envío de notificación:", err);
  }
};

// Validación y guardado del evento
const saveEvent = async () => {
  if (!newEvent.value.start || !newEvent.value.time || !newEvent.value.end) {
    showMessage("Aviso", "Por favor, completa todos los campos.");
    return;
  }
  if (!newEvent.value.title) {
    showMessage("Aviso", "El título del evento es obligatorio.");
    return;
  }
  if (toMinutes(newEvent.value.end) <= toMinutes(newEvent.value.time)) {
    showMessage("Aviso", "La hora de fin debe ser posterior a la hora de inicio.");
    return;
  }
  const newStart = toMinutes(newEvent.value.time);
  const newEnd = toMinutes(newEvent.value.end);
  const conflict = scheduledEvents.value.find(evt => {
    if (isEditing.value && evt.id === newEvent.value.id) return false;
    const evtStart = toMinutes(evt.time);
    if (evt.end) {
      const evtEnd = toMinutes(evt.end.split("T")[1]);
      return newStart < evtEnd && evtStart < newEnd;
    } else {
      return evt.time === newEvent.value.time;
    }
  });
  if (conflict) {
    showConflictConfirm.value = true;
    return;
  }
  await proceedSaveEvent();
};

const proceedSaveEvent = async () => {
  try {
    let savedEvent;
    if (isEditing.value) {
      const index = manualEvents.value.findIndex(e => e.id === newEvent.value.id);
      if (index !== -1) {
        await updateDoc(doc(db, "eventos", newEvent.value.id), {
          title: newEvent.value.title,
          start: newEvent.value.start,
          time: newEvent.value.time,
          end: newEvent.value.end,
          courseId: newEvent.value.courseId
        });
        manualEvents.value[index] = { ...newEvent.value };
        savedEvent = { ...newEvent.value };
      }
    } else {
      const currentUser = auth.currentUser;
      const docRef = await addDoc(collection(db, "eventos"), {
        title: newEvent.value.title,
        start: newEvent.value.start,
        time: newEvent.value.time,
        end: newEvent.value.end,
        courseId: newEvent.value.courseId,
        userId: currentUser ? currentUser.uid : null
      });
      savedEvent = {
        id: docRef.id,
        title: newEvent.value.title,
        start: newEvent.value.start,
        time: newEvent.value.time,
        end: newEvent.value.end,
        courseId: newEvent.value.courseId,
        userId: currentUser ? currentUser.uid : null
      };
      manualEvents.value.push(savedEvent);
    }
    closeModal();
    await loadEvents();
    // Enviar notificación por email luego de guardar el evento
    enviarNotificacionEmail(savedEvent);
  } catch (error) {
    console.error("Error guardando el evento:", error);
    showMessage("Error", "Ocurrió un error al guardar el evento. Inténtalo de nuevo.");
  }
};

const handleEventClick = info => {
  const evt = manualEvents.value.find(e => e.id === info.event.id);
  if (!evt) {
    showMessage("Aviso", "Este evento proviene de un curso. Para modificarlo, edita el curso en la sección correspondiente.");
    return;
  }
  openModal(evt);
};

const confirmDelete = async () => {
  if (!newEvent.value.id) return;
  try {
    await deleteDoc(doc(db, "eventos", newEvent.value.id));
    manualEvents.value = manualEvents.value.filter(e => e.id !== newEvent.value.id);
    closeModal();
    closeDeleteConfirm();
    await loadEvents();
  } catch (error) {
    console.error("Error eliminando el evento:", error);
    showMessage("Error", "Ocurrió un error al eliminar el evento.");
    closeDeleteConfirm();
  }
};

const handleFileUpload = event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      for (const row of rows) {
        if (row.Título && row.Fecha && row.Hora) {
          await addDoc(collection(db, "eventos"), {
            title: row.Título,
            start: row.Fecha,
            time: row.Hora,
            end: row.HoraFin || "",
            courseId: "",
            userId: auth.currentUser ? auth.currentUser.uid : null
          }).then(docRef => {
            manualEvents.value.push({
              id: docRef.id,
              title: row.Título,
              start: row.Fecha,
              time: row.Hora,
              end: row.HoraFin || "",
              courseId: "",
              userId: auth.currentUser ? auth.currentUser.uid : null
            });
          });
        }
      }
      await loadEvents();
    } catch (error) {
      console.error("Error procesando el archivo:", error);
      showMessage("Error", "Ocurrió un error al procesar el archivo. Verifica el formato.");
    }
  };
  reader.readAsArrayBuffer(file);
};

const loadEvents = async () => {
  isLoading.value = true;
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Usuario no autenticado");
    const q = query(collection(db, "eventos"), where("userId", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    manualEvents.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error cargando eventos:", error);
    errorMsg.value = "Error cargando eventos.";
  } finally {
    isLoading.value = false;
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
    console.error("Error cargando cursos:", error);
    errorMsg.value = "Error cargando cursos.";
  }
};

onMounted(async () => {
  await loadEvents();
  await loadCourses();
});

defineExpose({
  openModal,
  closeModal,
  saveEvent,
  openDeleteConfirm,
  closeDeleteConfirm,
  confirmDelete,
  cancelConflict,
  confirmConflict,
  closeMessageModal,
  handleFileUpload,
  handleEventClick
});
</script>

 
<style scoped>
/* Variables de color */
:root {
  --primary-color: #00509e;
  --secondary-color: #003366;
  --light-bg: #eef2f7;
  --medium-bg: #dde6f0;
  --white: #ffffff;
}

/* Global */
body, html {
  margin: 0;
  padding: 0;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: var(--light-bg);
}

/* Encabezado */
.header {
  background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
  color: var(--white);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
  text-align: center;
  margin-bottom: 20px;
}
.header h1 {
  font-size: 2.2rem;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header h1 i {
  font-size: 2.2rem;
  margin-right: 10px;
}

/* Acciones del Encabezado */
.actions {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 15px;
}
.add-event-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: #fff;
  border: none;
  padding: 14px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.3s ease, background 0.3s ease;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
}
.add-event-btn i {
  font-size: 1.6rem;
  margin-right: 8px;
}
.add-event-btn:hover {
  background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
  transform: scale(1.05);
}
.file-input {
  padding: 10px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

/* Calendario */
.custom-calendar {
  margin: 20px 0;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeInModal 0.3s ease;
}
@keyframes fadeInModal {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal Content */
.modal-content {
  background: var(--white);
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  text-align: center;
  border: 2px solid var(--primary-color);
  animation: popIn 0.3s ease;
}
@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.modal-title {
  font-size: 1.7rem;
  font-weight: bold;
  color: var(--secondary-color);
  margin-bottom: 20px;
}
.modal-content input,
.modal-content select {
  width: 100%;
  padding: 12px;
  margin: 12px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
  transition: border 0.3s;
}
.modal-content input:focus,
.modal-content select:focus {
  border-color: var(--primary-color);
  outline: none;
}
.modal-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}
.save-btn,
.delete-btn,
.cancel-btn {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.3s ease, background 0.3s ease;
  display: flex;
  align-items: center;
}
.save-btn {
  background: var(--primary-color);
  color: var(--white);
}
.save-btn:hover {
  background: var(--secondary-color);
  transform: scale(1.05);
}
.delete-btn {
  background: #dc3545;
  color: var(--white);
}
.delete-btn:hover {
  background: #c82333;
  transform: scale(1.05);
}
.cancel-btn {
  background: #6c757d;
  color: var(--white);
}
.cancel-btn:hover {
  background: #5a6268;
  transform: scale(1.05);
}

/* Scheduled events */
.scheduled-events {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: left;
}
.scheduled-events h3 {
  margin-top: 0;
  font-size: 1.3rem;
  color: var(--secondary-color);
}
.scheduled-events h4 {
  margin: 8px 0 4px;
  font-size: 1.1rem;
  color: var(--primary-color);
}
.scheduled-events ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.scheduled-events li {
  padding: 4px 0;
  font-size: 0.95rem;
  color: #333;
}

/* Responsive */
@media (max-width: 768px) {
  .header h1 {
    font-size: 1.8rem;
  }
  .add-event-btn, .file-input {
    font-size: 0.8rem;
    padding: 8px 12px;
  }
  .modal-content {
    padding: 16px;
  }
}
</style>
