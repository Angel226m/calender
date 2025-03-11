<template>
  <div class="app">
    <h1 class="title">
      <i class="mdi mdi-account-check-outline"></i>
      Registro de Asistencia
    </h1>
    <p class="motto">"La puntualidad es la base del éxito"</p>

    <!-- Filtros principales -->
    <div class="filters-container">
      <div class="filter-item">
        <i class="mdi mdi-magnify"></i>
        <input
          v-model="busqueda"
          placeholder="Buscar por nombre..."
          class="input-field"
          @keyup.enter="buscarNota"
        />
      </div>
      <div class="filter-item">
        <i class="mdi mdi-calendar"></i>
        <input type="date" v-model="fechaFiltro" class="input-field" />
      </div>
      <div class="filter-item">
        <i class="mdi mdi-book-open-page-variant"></i>
        <select v-model="cursoFiltro" class="input-field">
          <option value="">Selecciona Curso</option>
          <option v-for="curso in cursos" :key="curso.id" :value="curso.id">
            {{ curso.nombre }} - {{ curso.seccion }}
          </option>
        </select>
      </div>
      <button @click="exportarExcel" class="btn export-btn">
        <i class="mdi mdi-file-excel"></i>
        Exportar Excel
      </button>
    </div>

    <!-- Selección de curso para registro -->
    <div class="form-container">
      <select v-model="cursoSeleccionado" @change="cargarAlumnosPorCurso" class="input-field">
        <option disabled value="">Seleccionar Curso para Registro</option>
        <option v-for="curso in cursos" :key="curso.id" :value="curso.id">
          {{ curso.nombre }} - {{ curso.seccion }}
        </option>
      </select>
      <button @click="abrirModalRegistro" class="btn add-btn" :disabled="!cursoSeleccionado">
        <i class="mdi mdi-plus"></i>
        Registrar Asistencia
      </button>
    </div>

    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>

    <!-- Lista de fechas registradas -->
    <div class="fechas-container" v-if="fechasUnicas.length">
      <h2 class="sub-title">Fechas con registro:</h2>
      <div class="fechas-list scrollable">
        <button 
          v-for="fecha in fechasUnicas" 
          :key="fecha" 
          class="btn fecha-btn" 
          @click="abrirModalEdicion(fecha)"
        >
          <i class="mdi mdi-calendar-check"></i>
          {{ formatearFecha(fecha) }}
        </button>
      </div>
    </div>

    <!-- Modal de Registro de Asistencia -->
    <div class="modal-overlay" v-if="mostrarModalRegistro" @click="cerrarModalRegistro">
      <div class="modal" @click.stop>
        <h2 class="modal-title">Registrar asistencia</h2>
        <p class="curso-info">{{ cursoSeleccionadoNombre }}</p>
        <div class="fecha-actual">
          <i class="mdi mdi-calendar"></i>
          Fecha actual: {{ formatearFecha(fechaRegistro) }}
        </div>
        <table class="modal-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alumno in alumnos" :key="alumno.dni">
              <td>{{ alumno.nombre }} {{ alumno.apellido }}</td>
              <td>
                <select v-model="registroTemporal[alumno.dni]">
                  <option disabled value="">Seleccionar</option>
                  <option value="Presente">Presente</option>
                  <option value="Ausente">Ausente</option>
                  <option value="Justificada">Justificada</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        <input type="date" v-model="fechaRegistro" class="input-field" />
        <div class="modal-actions">
          <button @click="guardarRegistro" class="btn add-btn">
            <i class="mdi mdi-content-save"></i>
            Guardar
          </button>
          <button @click="cerrarModalRegistro" class="btn cancel-btn">
            <i class="mdi mdi-close-circle"></i>
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Edición de Asistencia -->
    <div class="modal-overlay" v-if="mostrarModalEdicion" @click="cerrarModalEdicion">
      <div class="modal" @click.stop>
        <h2 class="modal-title">Editar asistencia - {{ formatearFecha(fechaEdicion) }}</h2>
        <table class="modal-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Asistencia</th>
              <th>Editar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(asistencia, index) in registrosEdicion" :key="asistencia.id">
              <td>{{ asistencia.nombre }}</td>
              <td>
                <select v-model="registrosEdicion[index].estado">
                  <option value="Presente">Presente</option>
                  <option value="Ausente">Ausente</option>
                  <option value="Justificada">Justificada</option>
                </select>
              </td>
              <td>
                <button class="btn edit-btn">
                  <i class="mdi mdi-pencil"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="modal-actions">
          <button @click="actualizarRegistros" class="btn add-btn">
            <i class="mdi mdi-refresh"></i>
            Actualizar
          </button>
          <button @click="eliminarRegistrosFecha" class="btn delete-btn">
            <i class="mdi mdi-delete"></i>
            Eliminar Lista
          </button>
          <button @click="cerrarModalEdicion" class="btn cancel-btn">
            <i class="mdi mdi-close-circle"></i>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db, auth } from "@/services/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where
} from "firebase/firestore";
import * as XLSX from "xlsx";

export default {
  name: "AsistenciaView",
  data() {
    return {
      busqueda: "",
      fechaFiltro: "",
      cursoFiltro: "",
      asistencias: [],
      cursos: [],
      alumnos: [],
      cursoSeleccionado: "",
      fechaRegistro: this.getLocalDate(),
      mensajeError: "",
      ordenActual: "nombre",
      ordenAscendente: true,
      paginaActual: 1,
      registrosPorPagina: 5,
      mostrarModalRegistro: false,
      registroTemporal: {},
      mostrarModalEdicion: false,
      fechaEdicion: "",
      registrosEdicion: []
    };
  },
  computed: {
    asistenciasFiltradas() {
      return this.asistencias
        .filter(a => a.nombre.toLowerCase().includes(this.busqueda.toLowerCase()))
        .filter(a => (this.fechaFiltro ? a.fecha === this.fechaFiltro : true))
        .filter(a => (this.cursoFiltro ? a.cursoId === this.cursoFiltro : true))
        .sort((a, b) =>
          this.ordenAscendente
            ? a[this.ordenActual].toString().localeCompare(b[this.ordenActual].toString())
            : b[this.ordenActual].toString().localeCompare(a[this.ordenActual].toString())
        );
    },
    totalPaginas() {
      return Math.ceil(this.asistenciasFiltradas.length / this.registrosPorPagina);
    },
    asistenciasPaginadas() {
      const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
      return this.asistenciasFiltradas.slice(inicio, inicio + this.registrosPorPagina);
    },
    fechasUnicas() {
      const asistenciasCurso = this.cursoFiltro
        ? this.asistencias.filter(a => a.cursoId === this.cursoFiltro)
        : this.asistencias;
      const fechas = asistenciasCurso.map(a => a.fecha);
      return [...new Set(fechas)];
    },
    cursoSeleccionadoNombre() {
      const curso = this.cursos.find(c => c.id === this.cursoSeleccionado);
      return curso ? `${curso.nombre} - ${curso.seccion}` : '';
    }
  },
  async mounted() {
    await this.cargarCursos();       // Cargar cursos filtrando por el usuario actual
    await this.cargarAsistencias();    // Cargar asistencias filtrando por el usuario actual
  },
  methods: {
    // Retorna la fecha local en formato "YYYY-MM-DD"
    getLocalDate() {
      return new Date().toLocaleDateString('en-CA');
    },
    // Cargar cursos: filtra por el UID del usuario
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
    // Cuando se selecciona un curso, se cargan los alumnos (desde el curso seleccionado)
    cargarAlumnosPorCurso() {
      const curso = this.cursos.find(c => c.id === this.cursoSeleccionado);
      this.alumnos = curso ? curso.alumnos : [];
      this.registroTemporal = {};
      this.alumnos.forEach(alumno => {
        this.registroTemporal[alumno.dni] = "";
      });
    },
    // Cargar asistencias: se filtra para obtener solo los registros del usuario actual
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
    abrirModalRegistro() {
      if (!this.cursoSeleccionado) {
        this.mensajeError = "Seleccione un curso primero.";
        setTimeout(() => (this.mensajeError = ""), 2000);
        return;
      }
      this.fechaRegistro = this.getLocalDate();
      this.registroTemporal = {};
      this.alumnos.forEach(alumno => {
        this.registroTemporal[alumno.dni] = "";
      });
      this.mostrarModalRegistro = true;
    },
    cerrarModalRegistro() {
      this.mostrarModalRegistro = false;
    },
    // Guardar registro de asistencia: se añade userId para asociarlo al usuario actual
    async guardarRegistro() {
      if (!this.fechaRegistro) {
        this.mensajeError = "Seleccione una fecha.";
        setTimeout(() => (this.mensajeError = ""), 2000);
        return;
      }
      const currentUser = auth.currentUser;
      if (!currentUser) {
        this.mensajeError = "Usuario no autenticado.";
        return;
      }
      for (const alumno of this.alumnos) {
        const estado = this.registroTemporal[alumno.dni];
        if (!estado) continue;
        const docRef = await addDoc(collection(db, "asistencias"), {
          cursoId: this.cursoSeleccionado,
          nombre: `${alumno.nombre} ${alumno.apellido}`,
          dni: alumno.dni,
          fecha: this.fechaRegistro,
          estado,
          userId: currentUser.uid
        });
        this.asistencias.unshift({
          id: docRef.id,
          cursoId: this.cursoSeleccionado,
          nombre: `${alumno.nombre} ${alumno.apellido}`,
          dni: alumno.dni,
          fecha: this.fechaRegistro,
          estado,
          userId: currentUser.uid
        });
      }
      this.cerrarModalRegistro();
    },
    async abrirModalEdicion(fecha) {
      if (!this.cursoFiltro) {
        this.mensajeError = "Para editar, seleccione un curso en los filtros.";
        setTimeout(() => (this.mensajeError = ""), 2000);
        return;
      }
      this.fechaEdicion = fecha;
      const q = query(
        collection(db, "asistencias"),
        where("fecha", "==", fecha),
        where("cursoId", "==", this.cursoFiltro)
        // Opcional: agregar where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      this.registrosEdicion = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.mostrarModalEdicion = true;
    },
    cerrarModalEdicion() {
      this.mostrarModalEdicion = false;
    },
    async actualizarRegistros() {
      for (const registro of this.registrosEdicion) {
        await updateDoc(doc(db, "asistencias", registro.id), { estado: registro.estado });
      }
      await this.cargarAsistencias();
      this.cerrarModalEdicion();
    },
    async eliminarRegistrosFecha() {
      if (confirm("¿Seguro que deseas eliminar toda la lista de asistencia para este día?")) {
        for (const registro of this.registrosEdicion) {
          await deleteDoc(doc(db, "asistencias", registro.id));
        }
        await this.cargarAsistencias();
        this.cerrarModalEdicion();
      }
    },
    ordenarPor(campo) {
      this.ordenActual = campo;
      this.ordenAscendente = !this.ordenAscendente;
    },
    formatearFecha(fecha) {
      if (typeof fecha === 'string' && fecha.includes("-")) {
        const parts = fecha.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(fecha);
      const dia = d.getDate().toString().padStart(2, '0');
      const mes = (d.getMonth() + 1).toString().padStart(2, '0');
      const anio = d.getFullYear();
      return `${dia}/${mes}/${anio}`;
    },
    estadoClase(estado) {
      return estado === "Presente"
        ? "presente"
        : estado === "Justificada"
        ? "justificada"
        : "ausente";
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
    buscarNota() {
      if (!this.busqueda.trim()) {
        this.mensajeError = "⚠️ Ingresa un término de búsqueda.";
        setTimeout(() => (this.mensajeError = ""), 2000);
      }
    }
  }
};
</script>

<style scoped>
/* ======================
   Diseño General
========================= */
.app {
  font-family: Arial, sans-serif;
  background: #eef2f7;
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
  max-width: 1200px;
  margin: auto;
}

/* Título principal */
.title {
  font-size: 2.8rem;
  color: #003366;
  text-align: center;
  margin-bottom: 15px;
  border-bottom: 3px solid #00509e;
  padding-bottom: 10px;
}

/* Frase motivadora */
.motto {
  text-align: center;
  font-size: 1.3rem;
  color: #00509e;
  margin-bottom: 30px;
}

/* Filtros y formulario */
.filters-container,
.form-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 25px;
  align-items: center;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
}
.input-field,
select {
  padding: 12px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  flex: 1;
}
.input-field:focus,
select:focus {
  border-color: #00509e;
  box-shadow: 0 0 5px rgba(0,80,158,0.5);
  outline: none;
}

/* Botones */
.btn {
  padding: 12px 18px;
  font-size: 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #003366, #00509e);
  color: #fff;
  transition: background 0.3s ease, transform 0.3s ease;
}
.btn:hover {
  background: linear-gradient(135deg, #00509e, #003366);
  transform: scale(1.04);
}
.add-btn {
  background: linear-gradient(135deg, #00509e, #003366);
}
.delete-btn {
  background: #dc3545;
}
.cancel-btn {
  background: #6c757d;
}
.export-btn {
  background: #00a6ff;
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 25px;
}
.pagination button {
  background: #00509e;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.3s;
}
.pagination button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

/* Fechas */
.fechas-container {
  margin: 20px 0;
}
.sub-title {
  font-size: 1.8rem;
  color: #003366;
  margin-bottom: 10px;
}
.fechas-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
}
.fecha-btn {
  background: #003366;
  color: #fff;
  padding: 10px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.3s ease;
}
.fecha-btn:hover {
  background: #00509e;
}
.fecha-actual {
  margin: 10px 0;
  font-weight: bold;
  font-size: 1.1rem;
  text-align: center;
}

/* Modal */
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
  z-index: 110;
}
.modal {
  background: #fff;
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  border: 2px solid #00509e;
}
.modal h2 {
  margin-top: 0;
  color: #003366;
  text-align: center;
}
.modal-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
.modal-table th,
.modal-table td {
  padding: 10px;
  border: 1px solid #ddd;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

/* Responsive */
@media (max-width: 768px) {
  .folder-create, .notes-header {
    flex-direction: column;
  }
}
</style>
