<template>
  <div>
    <!-- Encabezado -->
    <div class="header">
      <h1>📅 Calendario de Eventos</h1>
      <div class="actions">
        <button class="add-event-btn" @click="openModal()">➕ Agregar Evento</button>
        <input type="file" class="file-input" @change="handleFileUpload" accept=".xlsx, .xls" />
      </div>
    </div>

    <!-- Calendario -->
    <FullCalendar
      ref="calendarRef"
      class="custom-calendar"
      :options="calendarOptions"
    />

    <!-- Modal para agregar/editar evento manual -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">{{ isEditing ? "Editar Evento" : "Agregar Evento" }}</h2>
        <!-- Campo para título (opcional) -->
        <input v-model="newEvent.title" placeholder="Título del evento (opcional)" />
        <!-- Campo para seleccionar fecha (valor por defecto y mínimo = ayer) -->
        <input v-model="newEvent.start" type="date" :min="minDate" required />
        <!-- Campo para seleccionar hora -->
        <input v-model="newEvent.time" type="time" required />
        <!-- Selección de curso (opcional) -->
        <select v-model="newEvent.courseId">
          <option disabled value="">Seleccionar Curso (opcional)</option>
          <option v-for="curso in courses" :key="curso.id" :value="curso.id">
            {{ curso.nombre }} - {{ curso.seccion }}
          </option>
        </select>

        <!-- Mostrar eventos programados para la fecha seleccionada -->
        <div v-if="scheduledEvents.length" class="scheduled-events">
          <h3>Eventos programados para este día:</h3>
          <ul>
            <li v-for="evt in scheduledEvents" :key="evt.id">
              {{ evt.title }} - {{ evt.course ? evt.course : '' }} - {{ evt.time }}
            </li>
          </ul>
        </div>

        <div class="modal-buttons">
          <button class="save-btn" @click="saveEvent">💾 Guardar</button>
          <button v-if="isEditing" class="delete-btn" @click="openDeleteConfirm">🗑️ Eliminar</button>
          <button class="cancel-btn" @click="closeModal">❌ Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación para eliminación -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="closeDeleteConfirm">
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
    <div v-if="showConflictConfirm" class="modal-overlay" @click="cancelConflict">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">Conflicto de Horario</h2>
        <p>Ya existe un evento en esa fecha y hora. ¿Deseas continuar de todas formas?</p>
        <div class="modal-buttons">
          <button class="save-btn" @click="confirmConflict">Continuar</button>
          <button class="cancel-btn" @click="cancelConflict">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Notificación (errores, avisos, etc.) -->
    <div v-if="showMessageModal" class="modal-overlay" @click="closeMessageModal">
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
  where
} from "firebase/firestore";

// Función para obtener la fecha de ayer en formato ISO (YYYY-MM-DD)
const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

const defaultDate = computed(() => getYesterday());
const minDate = computed(() => defaultDate.value);

// Estado y manejo de errores
const isLoading = ref(false);
const errorMsg = ref("");

// Eventos manuales y cursos (Firebase)
// NOTA: Al cargar eventos, se filtran por userId (del usuario autenticado)
const manualEvents = ref([]);
const courses = ref([]);

// Mapeo de días de la semana para cursos
const diasSemana = {
  "Domingo": 0,
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5,
  "Sábado": 6
};

// Combina fecha y hora para eventos manuales
const events = computed(() => {
  const manual = manualEvents.value.map(e => ({
    ...e,
    start: e.start + "T" + e.time
  }));
  const courseEvents = courses.value.map(curso => {
    const targetDay = diasSemana[curso.dia];
    if (targetDay === undefined) return null;
    return {
      id: `curso-${curso.id}`,
      title: `${curso.nombre} - ${curso.seccion}`,
      daysOfWeek: [targetDay],
      startTime: curso.hora,
      startRecur: curso.fechaInicio,
      endRecur: curso.fechaFin,
      course: curso.nombre
    };
  }).filter(evt => evt !== null);
  return [...manual, ...courseEvents];
});

// Variables del modal para agregar/editar eventos
const showModal = ref(false);
const isEditing = ref(false);
const newEvent = ref({ id: null, title: "", start: "", time: "", courseId: "" });

// Referencia al calendario
const calendarRef = ref(null);

// Abre el modal, asignando valores por defecto (fecha = ayer, hora actual)
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
      courseId: ""
    };
  }
  showModal.value = true;
};

// Cierra el modal y reinicia newEvent
const closeModal = () => {
  showModal.value = false;
  newEvent.value = { id: null, title: "", start: "", time: "", courseId: "" };
};

// Configuración de FullCalendar
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  locale: "es",
  timeZone: "America/Lima",
  editable: false, // No permite mover eventos
  selectable: true,
  events: events.value,
  eventDidMount: info => {
    // Si el evento es manual (no proviene de un curso), aplica resaltado
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

// Filtra eventos programados para la fecha seleccionada en el modal
const scheduledEvents = computed(() => {
  if (!newEvent.value.start) return [];
  return events.value.filter(evt => {
    if (evt.daysOfWeek === undefined) {
      return evt.start.split("T")[0] === newEvent.value.start;
    }
    const fecha = new Date(newEvent.value.start);
    const inicio = new Date(evt.startRecur);
    const fin = new Date(evt.endRecur);
    return fecha >= inicio && fecha <= fin && evt.daysOfWeek.includes(fecha.getDay());
  });
});

// Modal de notificaciones
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

// Guarda o actualiza el evento en Firebase
const proceedSaveEvent = async () => {
  try {
    if (isEditing.value) {
      const index = manualEvents.value.findIndex(e => e.id === newEvent.value.id);
      if (index !== -1) {
        await updateDoc(doc(db, "eventos", newEvent.value.id), {
          title: newEvent.value.title,
          start: newEvent.value.start,
          time: newEvent.value.time,
          courseId: newEvent.value.courseId
          // No se actualiza userId en la edición
        });
        manualEvents.value[index] = { ...newEvent.value };
      }
    } else {
      // Al crear un nuevo evento, se añade userId del usuario actual
      const currentUser = auth.currentUser;
      await addDoc(collection(db, "eventos"), {
        title: newEvent.value.title,
        start: newEvent.value.start,
        time: newEvent.value.time,
        courseId: newEvent.value.courseId,
        userId: currentUser ? currentUser.uid : null
      }).then(docRef => {
        manualEvents.value.push({
          id: docRef.id,
          title: newEvent.value.title,
          start: newEvent.value.start,
          time: newEvent.value.time,
          courseId: newEvent.value.courseId,
          userId: currentUser ? currentUser.uid : null
        });
      });
    }
    closeModal();
  } catch (error) {
    console.error("Error guardando el evento:", error);
    showMessage("Error", "Ocurrió un error al guardar el evento. Inténtalo de nuevo.");
  }
};

// Valida y guarda el evento
const saveEvent = async () => {
  if (!newEvent.value.start || !newEvent.value.time) {
    showMessage("Aviso", "Por favor, completa todos los campos.");
    return;
  }
  // Si no hay título y se ha seleccionado un curso, se genera un título automáticamente
  if (!newEvent.value.title && newEvent.value.courseId) {
    const selected = courses.value.find(c => c.id === newEvent.value.courseId);
    newEvent.value.title = selected ? `${selected.nombre} - ${selected.seccion}` : "";
  }
  // Verifica si ya existe un evento en la misma fecha y hora (conflicto)
  const conflict = manualEvents.value.find(e =>
    e.start === newEvent.value.start &&
    e.time === newEvent.value.time &&
    (!isEditing.value || e.id !== newEvent.value.id)
  );
  if (conflict) {
    showConflictConfirm.value = true;
    return;
  }
  await proceedSaveEvent();
};

// Al hacer clic en un evento manual, abre el modal de edición
const handleEventClick = info => {
  const evt = manualEvents.value.find(e => e.id === info.event.id);
  if (!evt) {
    showMessage("Aviso", "Este evento proviene de un curso. Para modificarlo, edita el curso en la sección correspondiente.");
    return;
  }
  openModal(evt);
};

// Elimina el evento seleccionado
const confirmDelete = async () => {
  if (!newEvent.value.id) return;
  try {
    await deleteDoc(doc(db, "eventos", newEvent.value.id));
    manualEvents.value = manualEvents.value.filter(e => e.id !== newEvent.value.id);
    closeModal();
    closeDeleteConfirm();
  } catch (error) {
    console.error("Error eliminando el evento:", error);
    showMessage("Error", "Ocurrió un error al eliminar el evento.");
    closeDeleteConfirm();
  }
};

// Procesa la carga de un archivo Excel y agrega eventos manuales
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
            courseId: "",
            userId: auth.currentUser ? auth.currentUser.uid : null
          }).then(docRef => {
            manualEvents.value.push({
              id: docRef.id,
              title: row.Título,
              start: row.Fecha,
              time: row.Hora,
              courseId: "",
              userId: auth.currentUser ? auth.currentUser.uid : null
            });
          });
        }
      }
    } catch (error) {
      console.error("Error procesando el archivo:", error);
      showMessage("Error", "Ocurrió un error al procesar el archivo. Verifica el formato.");
    }
  };
  reader.readAsArrayBuffer(file);
};

// Carga eventos desde Firebase filtrados por el usuario actual
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

// Carga cursos desde Firebase filtrados por el usuario actual
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
/* ======================
Estilos Generales
========================= */
body, html {
  margin: 0;
  padding: 0;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: #eef2f7;
}

/* ======================
Encabezado
========================= */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #003366, #00509e);
  color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.25);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
}

.header h1 i {
  font-size: 2rem;
  margin-right: 10px;
}

/* ======================
Acciones en el Encabezado
========================= */
.actions {
  display: flex;
  gap: 12px;
}

.add-event-btn {
  background: linear-gradient(135deg, #00509e, #003366);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.3s ease-in-out, background 0.3s ease-in-out;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
}

.add-event-btn i {
  font-size: 1.5rem;
  margin-right: 6px;
}

.add-event-btn:hover {
  background: linear-gradient(135deg, #003366, #00509e);
  transform: scale(1.05);
}

.file-input {
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

/* ======================
Calendario
========================= */
.custom-calendar {
  margin: 20px 0;
}

/* Resalta los eventos manuales con fondo celeste, borde azul y texto oscuro */
.fc-event.manual-event {
  background-color: #cceeff !important;
  border: 2px solid #007acc !important;
  color: #003366 !important;
}

/* ======================
Modal
========================= */
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
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  text-align: center;
  border: 2px solid #00509e;
  animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
  from { transform: translateY(-20px); }
  to { transform: translateY(0); }
}

.modal-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #003366;
  margin-bottom: 20px;
}

.modal-content input,
.modal-content select {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
  transition: border 0.3s;
}

.modal-content input:focus,
.modal-content select:focus {
  border-color: #00509e;
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
  transition: transform 0.3s ease-in-out, background 0.3s ease-in-out;
  display: flex;
  align-items: center;
}

.save-btn {
  background: #00509e;
  color: white;
}

.save-btn:hover {
  background: #003366;
  transform: scale(1.05);
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
  transform: scale(1.05);
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
  transform: scale(1.05);
}

/* ======================
Lista de Cursos
========================= */
.cursos-list {
  list-style: none;
  padding: 0 10px;
}

.curso-item {
  padding: 12px;
  margin-bottom: 8px;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  background: #e6f0ff;
  border-radius: 5px;
  box-shadow: 0px 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.2s ease-in-out;
}

.curso-item:hover {
  transform: scale(1.03);
}

.curso-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

/* ======================
Subida de Archivo
========================= */
.file-upload-section {
  margin-top: 15px;
  padding: 0 10px;
}

.error-message {
  color: #dc3545;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
}
</style>
