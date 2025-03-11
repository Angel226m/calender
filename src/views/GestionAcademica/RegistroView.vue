<template>
  <div class="app-container">
    <h1 class="title"><i class="mdi mdi-school"></i> Registro de Cursos y Alumnos</h1>

    <!-- Formulario para agregar curso (CREACIÓN) -->
    <section class="form-section">
      <h2 class="form-title"><i class="mdi mdi-book-plus"></i> Crear Curso</h2>
      <div class="form-group">
        <div class="input-group">
          <i class="mdi mdi-alphabetical"></i>
          <input
            v-model.trim="seccionCurso"
            placeholder="Sección (Ej: A, B, C)"
            class="input-field"
          />
        </div>
        <div class="input-group">
          <i class="mdi mdi-book-open-page-variant"></i>
          <input
            v-model.trim="nombreCurso"
            placeholder="Nombre del Curso"
            class="input-field"
          />
        </div>
        <div class="input-group">
          <i class="mdi mdi-calendar-range"></i>
          <select v-model="diaCurso" class="input-field">
            <option disabled value="">Seleccione un día</option>
            <option value="Lunes">Lunes</option>
            <option value="Martes">Martes</option>
            <option value="Miércoles">Miércoles</option>
            <option value="Jueves">Jueves</option>
            <option value="Viernes">Viernes</option>
            <option value="Sábado">Sábado</option>
            <option value="Domingo">Domingo</option>
          </select>
        </div>
        <div class="input-group">
          <i class="mdi mdi-clock-outline"></i>
          <input v-model.trim="horaCurso" type="time" class="input-field" />
        </div>
        <div class="date-group">
          <div class="input-group">
            <label class="date-label">Inicio</label>
            <i class="mdi mdi-calendar"></i>
            <input v-model="fechaInicioCurso" type="date" class="input-field" />
          </div>
          <div class="input-group">
            <label class="date-label">Fin</label>
            <i class="mdi mdi-calendar-check"></i>
            <input
              v-model="fechaFinCurso"
              type="date"
              class="input-field"
              :min="fechaInicioCurso"
            />
          </div>
        </div>
      </div>
      <div class="button-group">
        <button @click="registrarCurso" class="btn btn-primary">
          <i class="mdi mdi-plus"></i> Crear Curso
        </button>
      </div>
    </section>

    <!-- Lista de Cursos -->
    <section v-if="cursos.length" class="cursos-list-section">
      <h2 class="form-title"><i class="mdi mdi-format-list-bulleted"></i> Lista de Cursos</h2>
      <ul class="cursos-list">
        <li v-for="curso in cursos" :key="curso.id" class="curso-item">
          <div class="curso-info">
            <strong>{{ curso.seccion }} - {{ curso.nombre }}</strong>
            <br />
            <em>
              <i class="mdi mdi-calendar-range"></i> {{ curso.dia }} - {{ curso.hora }}<br />
              <i class="mdi mdi-calendar"></i> Del: {{ formatearFecha(curso.fechaInicio) }} al: {{ formatearFecha(curso.fechaFin) }}
            </em>
          </div>
          <div class="curso-actions">
            <button @click="abrirModal(curso.id)" class="btn btn-secondary">
              <i class="mdi mdi-account-multiple"></i> Ver Alumnos
            </button>
            <div class="action-group">
              <button @click="seleccionarCursoParaEdicion(curso)" class="btn btn-edit">
                <i class="mdi mdi-pencil"></i> Editar
              </button>
              <button @click="eliminarCurso(curso.id)" class="btn btn-delete">
                <i class="mdi mdi-delete"></i> Eliminar
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Modal para editar curso (EDICIÓN) -->
    <div v-if="mostrarModalCurso" class="modal-overlay" @click="cerrarModalCurso">
      <div class="modal" @click.stop>
        <h2 class="modal-title"><i class="mdi mdi-pencil-box"></i> Editar Curso</h2>
        <div class="form-group">
          <div class="input-group">
            <i class="mdi mdi-alphabetical"></i>
            <input
              v-model.trim="cursoEdit.seccion"
              placeholder="Sección (Ej: A, B, C)"
              class="input-field"
            />
          </div>
          <div class="input-group">
            <i class="mdi mdi-book-open-page-variant"></i>
            <input
              v-model.trim="cursoEdit.nombre"
              placeholder="Nombre del Curso"
              class="input-field"
            />
          </div>
          <div class="input-group">
            <i class="mdi mdi-calendar-range"></i>
            <select v-model="cursoEdit.dia" class="input-field">
              <option disabled value="">Seleccione un día</option>
              <option value="Lunes">Lunes</option>
              <option value="Martes">Martes</option>
              <option value="Miércoles">Miércoles</option>
              <option value="Jueves">Jueves</option>
              <option value="Viernes">Viernes</option>
              <option value="Sábado">Sábado</option>
              <option value="Domingo">Domingo</option>
            </select>
          </div>
          <div class="input-group">
            <i class="mdi mdi-clock-outline"></i>
            <input v-model.trim="cursoEdit.hora" type="time" class="input-field" />
          </div>
          <div class="date-group">
            <div class="input-group">
              <label class="date-label">Inicio</label>
              <i class="mdi mdi-calendar"></i>
              <input
                v-model="cursoEdit.fechaInicio"
                type="date"
                class="input-field"
              />
            </div>
            <div class="input-group">
              <label class="date-label">Fin</label>
              <i class="mdi mdi-calendar-check"></i>
              <input
                v-model="cursoEdit.fechaFin"
                type="date"
                class="input-field"
                :min="cursoEdit.fechaInicio"
              />
            </div>
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="actualizarCurso" class="btn btn-edit">
            <i class="mdi mdi-refresh"></i> Actualizar
          </button>
          <button @click="cerrarModalCurso" class="btn btn-cancel">
            <i class="mdi mdi-close-circle"></i> Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal para gestionar alumnos -->
    <div v-if="modalAbierto" class="modal-overlay">
      <div class="modal-content">
        <h2><i class="mdi mdi-account-group"></i> Alumnos en {{ cursoSeleccionadoData.nombre }}</h2>
        <p class="curso-details">
          <strong>Sección:</strong> {{ cursoSeleccionadoData.seccion }} |
          <strong>Horario:</strong> {{ cursoSeleccionadoData.dia }} {{ cursoSeleccionadoData.hora }}<br />
          <strong>Duración:</strong> Del {{ formatearFecha(cursoSeleccionadoData.fechaInicio) }} al {{ formatearFecha(cursoSeleccionadoData.fechaFin) }}
        </p>
        <!-- Formulario para agregar/editar alumno -->
        <div class="form-group">
          <div class="input-group">
            <i class="mdi mdi-account"></i>
            <input v-model.trim="nombreAlumno" placeholder="Nombre" class="input-field" />
          </div>
          <div class="input-group">
            <i class="mdi mdi-account-box"></i>
            <input v-model.trim="apellidoAlumno" placeholder="Apellido" class="input-field" />
          </div>
          <div class="input-group">
            <i class="mdi mdi-card-account-details-outline"></i>
            <input v-model.trim="dniAlumno" placeholder="DNI" class="input-field" />
          </div>
        </div>
        <div class="button-group">
          <button @click="registrarAlumno" class="btn btn-primary">
            <i class="mdi mdi-plus"></i> Agregar Alumno
          </button>
          <button v-if="alumnoSeleccionado" @click="editarAlumno" class="btn btn-edit">
            <i class="mdi mdi-pencil"></i> Editar Alumno
          </button>
        </div>
        <!-- Lista de Alumnos -->
        <div class="alumnos-scroll-container">
          <table class="alumnos-table">
            <thead>
              <tr>
                <th><i class="mdi mdi-account"></i> Nombre</th>
                <th><i class="mdi mdi-account-box"></i> Apellido</th>
                <th><i class="mdi mdi-card-account-details-outline"></i> DNI</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="alumno in cursoSeleccionadoData.alumnos" :key="alumno.dni">
                <td>{{ alumno.nombre }}</td>
                <td>{{ alumno.apellido }}</td>
                <td>{{ alumno.dni }}</td>
                <td>
                  <button @click="eliminarAlumno(alumno.dni)" class="btn btn-delete">
                    <i class="mdi mdi-delete"></i> Eliminar
                  </button>
                  <button @click="seleccionarAlumnoParaEdicion(alumno)" class="btn btn-edit">
                    <i class="mdi mdi-pencil"></i> Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="cerrarModal" class="btn btn-close">
          <i class="mdi mdi-close"></i> Cerrar
        </button>
      </div>
    </div>

    <!-- Sección para cargar archivo XLSX -->
    <section class="file-upload-section">
      <h2 class="form-title"><i class="mdi mdi-file-excel"></i> Cargar Datos desde XLSX</h2>
      <input type="file" @change="importarXLSX" accept=".xlsx" />
    </section>

    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>

    <!-- Modal de Error -->
    <div v-if="mostrarErrorModal" class="error-modal-overlay" @click="cerrarErrorModal">
      <div class="error-modal">
        <h2><i class="mdi mdi-alert-circle"></i> Error</h2>
        <p>{{ mensajeError }}</p>
        <button @click="cerrarErrorModal" class="btn btn-close">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db, auth } from "@/services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc
} from "firebase/firestore";
import * as XLSX from "xlsx";

export default {
  name: "CursosAlumnosView",
  data() {
    return {
      // Campos para curso
      seccionCurso: "",
      nombreCurso: "",
      diaCurso: "",
      horaCurso: "",
      fechaInicioCurso: "",
      fechaFinCurso: "",
      // Campos para alumno
      nombreAlumno: "",
      apellidoAlumno: "",
      dniAlumno: "",
      // Datos cargados de cursos
      cursos: [],
      cursoSeleccionado: "",
      modalAbierto: false,
      alumnoSeleccionado: null,
      mensajeError: "",
      editandoCurso: false,
      editandoAlumno: false,
      mostrarErrorModal: false,
      mostrarModalCurso: false,
      // Objeto para edición de curso (formulario separado)
      cursoEdit: {
        seccion: "",
        nombre: "",
        dia: "",
        hora: "",
        fechaInicio: "",
        fechaFin: ""
      }
    };
  },
  computed: {
    // Devuelve el curso seleccionado, o un objeto vacío con alumnos
    cursoSeleccionadoData() {
      return this.cursos.find((curso) => curso.id === this.cursoSeleccionado) || { alumnos: [] };
    }
  },
  async created() {
    await this.cargarCursosDesdeFirestore();
  },
  methods: {
    // Función para importar datos desde un archivo XLSX (lógica a implementar según tu modelo)
    async importarXLSX(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log("Datos importados:", jsonData);
        // Lógica para guardar estos datos en Firestore según tu modelo
      };
      reader.readAsArrayBuffer(file);
    },
    // Cargar cursos filtrando por el UID del usuario actual
    async cargarCursosDesdeFirestore() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.error("Usuario no autenticado");
          return;
        }
        const cursosRef = collection(db, "cursos");
        const q = query(cursosRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        this.cursos = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error al cargar los cursos:", error);
      }
    },
    // Registrar un curso nuevo o actualizar uno existente
    async registrarCurso() {
      if (!this.seccionCurso || !this.nombreCurso || !this.diaCurso || !this.horaCurso || !this.fechaInicioCurso || !this.fechaFinCurso) {
        this.mostrarError("⚠️ Todos los campos son obligatorios.");
        return;
      }
      if (new Date(this.fechaFinCurso) < new Date(this.fechaInicioCurso)) {
        this.mostrarError("La fecha de fin no puede ser anterior a la fecha de inicio.");
        return;
      }
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          this.mostrarError("Usuario no autenticado.");
          return;
        }
        if (this.editandoCurso) {
          const cursoRef = doc(db, "cursos", this.cursoSeleccionado);
          await updateDoc(cursoRef, {
            seccion: this.seccionCurso.trim(),
            nombre: this.nombreCurso.trim(),
            dia: this.diaCurso.trim(),
            hora: this.horaCurso.trim(),
            fechaInicio: this.fechaInicioCurso,
            fechaFin: this.fechaFinCurso
            // No es necesario actualizar userId en una edición
          });
        } else {
          const docRef = await addDoc(collection(db, "cursos"), {
            seccion: this.seccionCurso.trim(),
            nombre: this.nombreCurso.trim(),
            dia: this.diaCurso.trim(),
            hora: this.horaCurso.trim(),
            fechaInicio: this.fechaInicioCurso,
            fechaFin: this.fechaFinCurso,
            alumnos: [],
            userId: currentUser.uid  // Asocia el curso al usuario actual
          });
          this.cursos.push({
            id: docRef.id,
            seccion: this.seccionCurso,
            nombre: this.nombreCurso,
            dia: this.diaCurso,
            hora: this.horaCurso,
            fechaInicio: this.fechaInicioCurso,
            fechaFin: this.fechaFinCurso,
            alumnos: [],
            userId: currentUser.uid
          });
        }
        this.resetCursoForm();
        await this.cargarCursosDesdeFirestore();
      } catch (error) {
        console.error("Error al guardar curso:", error);
      }
    },
    async eliminarCurso(id) {
      try {
        await deleteDoc(doc(db, "cursos", id));
        this.cursos = this.cursos.filter((curso) => curso.id !== id);
      } catch (error) {
        console.error("Error al eliminar curso:", error);
      }
    },
    abrirModal(id) {
      this.cursoSeleccionado = id;
      this.modalAbierto = true;
    },
    cerrarModal() {
      this.modalAbierto = false;
      this.resetAlumnoForm();
    },
    async registrarAlumno() {
      if (!this.nombreAlumno || !this.apellidoAlumno || !this.dniAlumno) {
        this.mostrarError("⚠️ Todos los campos son obligatorios.");
        return;
      }
      try {
        const cursoRef = doc(db, "cursos", this.cursoSeleccionado);
        const curso = this.cursoSeleccionadoData;
        if (this.editandoAlumno) {
          const alumnoIndex = curso.alumnos.findIndex((alumno) => alumno.dni === this.dniAlumno);
          curso.alumnos[alumnoIndex] = { nombre: this.nombreAlumno, apellido: this.apellidoAlumno, dni: this.dniAlumno };
        } else {
          curso.alumnos.push({ nombre: this.nombreAlumno, apellido: this.apellidoAlumno, dni: this.dniAlumno });
        }
        await updateDoc(cursoRef, { alumnos: curso.alumnos });
        this.resetAlumnoForm();
        await this.cargarCursosDesdeFirestore();
      } catch (error) {
        console.error("Error al registrar alumno:", error);
      }
    },
    async eliminarAlumno(dni) {
      try {
        const cursoRef = doc(db, "cursos", this.cursoSeleccionado);
        const curso = this.cursoSeleccionadoData;
        curso.alumnos = curso.alumnos.filter((alumno) => alumno.dni !== dni);
        await updateDoc(cursoRef, { alumnos: curso.alumnos });
        await this.cargarCursosDesdeFirestore();
      } catch (error) {
        console.error("Error al eliminar alumno:", error);
      }
    },
    resetCursoForm() {
      this.seccionCurso = "";
      this.nombreCurso = "";
      this.diaCurso = "";
      this.horaCurso = "";
      this.fechaInicioCurso = "";
      this.fechaFinCurso = "";
      this.editandoCurso = false;
    },
    resetAlumnoForm() {
      this.nombreAlumno = "";
      this.apellidoAlumno = "";
      this.dniAlumno = "";
      this.editandoAlumno = false;
      this.alumnoSeleccionado = null;
    },
    mostrarError(mensaje) {
      this.mensajeError = mensaje;
      this.mostrarErrorModal = true;
    },
    cerrarErrorModal() {
      this.mensajeError = "";
      this.mostrarErrorModal = false;
    },
    seleccionarCursoParaEdicion(curso) {
      this.cursoEdit = {
        seccion: curso.seccion,
        nombre: curso.nombre,
        dia: curso.dia,
        hora: curso.hora,
        fechaInicio: curso.fechaInicio,
        fechaFin: curso.fechaFin
      };
      this.cursoSeleccionado = curso.id;
      this.editandoCurso = true;
      this.abrirModalEdicionCurso();
    },
    abrirModalEdicionCurso() {
      this.mostrarModalCurso = true;
    },
    cerrarModalCurso() {
      this.mostrarModalCurso = false;
    },
    async actualizarCurso() {
      if (!this.cursoEdit.seccion || !this.cursoEdit.nombre || !this.cursoEdit.dia ||
          !this.cursoEdit.hora || !this.cursoEdit.fechaInicio || !this.cursoEdit.fechaFin) {
        this.mostrarError("⚠️ Todos los campos son obligatorios.");
        return;
      }
      if (new Date(this.cursoEdit.fechaFin) < new Date(this.cursoEdit.fechaInicio)) {
        this.mostrarError("La fecha de fin no puede ser anterior a la fecha de inicio.");
        return;
      }
      try {
        const cursoRef = doc(db, "cursos", this.cursoSeleccionado);
        await updateDoc(cursoRef, {
          seccion: this.cursoEdit.seccion.trim(),
          nombre: this.cursoEdit.nombre.trim(),
          dia: this.cursoEdit.dia.trim(),
          hora: this.cursoEdit.hora.trim(),
          fechaInicio: this.cursoEdit.fechaInicio,
          fechaFin: this.cursoEdit.fechaFin,
        });
        this.resetCursoForm();
        this.cerrarModalCurso();
        await this.cargarCursosDesdeFirestore();
      } catch (error) {
        console.error("Error al actualizar curso:", error);
      }
    },
    editarCurso() {
      this.actualizarCurso();
    },
    seleccionarAlumnoParaEdicion(alumno) {
      this.nombreAlumno = alumno.nombre;
      this.apellidoAlumno = alumno.apellido;
      this.dniAlumno = alumno.dni;
      this.alumnoSeleccionado = alumno;
      this.editandoAlumno = true;
    },
    editarAlumno() {
      this.registrarAlumno();
    },
    formatearFecha(fecha) {
      if (!fecha) return "";
      if (typeof fecha === "string" && fecha.includes("-")) {
        const parts = fecha.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(fecha);
      const dia = d.getDate().toString().padStart(2, "0");
      const mes = (d.getMonth() + 1).toString().padStart(2, "0");
      const anio = d.getFullYear();
      return `${dia}/${mes}/${anio}`;
    }
  }
};
</script>


<style scoped>
/* ======================
   Diseño General
========================= */
body {
  font-family: Arial, sans-serif;
  background-color: #eef2f7;
  color: #333;
  margin: 0;
  padding: 20px 10px;
  line-height: 1.5;
}

.app-container {
  max-width: 1200px;
  margin: auto;
  background: #fff;
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

/* Título principal */
.title {
  text-align: center;
  color: #003366;
  font-size: 2.8rem;
  font-weight: bold;
  margin-bottom: 20px;
  border-bottom: 3px solid #00509e;
  padding-bottom: 10px;
}

/* Formularios y Filtros */
.form-title {
  color: #003366;
  font-size: 1.8rem;
  margin-bottom: 10px;
  font-weight: bold;
  border-bottom: 2px solid #00509e;
  padding-bottom: 5px;
}

.form-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.input-group i {
  color: #00509e;
  font-size: 1.2rem;
}

.input-field {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.input-field:focus {
  border-color: #00509e;
  box-shadow: 0 0 5px rgba(0,80,158,0.5);
  outline: none;
}

.date-group {
  display: flex;
  gap: 15px;
  width: 100%;
}

.date-label {
  font-size: 0.9rem;
  color: #003366;
  margin-right: 5px;
}

/* Botones */
.btn {
  padding: 12px 18px;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s ease, transform 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.btn:hover {
  transform: scale(1.05);
}

.btn-primary {
  background: linear-gradient(135deg, #003366, #00509e);
  color: #fff;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #00509e, #003366);
}

.btn-secondary {
  background: #00a6ff;
  color: #fff;
}

.btn-secondary:hover {
  background: #008ecc;
}

.btn-edit {
  background: #ffaa00;
  color: #fff;
}

.btn-edit:hover {
  background: #cc8800;
}

.btn-delete {
  background: #cc0000;
  color: #fff;
}

.btn-delete:hover {
  background: #a80000;
}

.btn-close {
  background: #666;
  color: #fff;
}

.btn-close:hover {
  background: #444;
}

/* Grupo de acciones */
.action-group {
  display: inline-flex;
  gap: 10px;
}

/* Lista de Cursos */
.cursos-list {
  list-style: none;
  padding: 0 10px;
}

.curso-item {
  padding: 15px;
  margin-bottom: 10px;
  font-size: 16px;
  background: #e6f0ff;
  border: 1px solid #bdd3f0;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.curso-item:hover {
  transform: scale(1.03);
}

.curso-info {
  font-size: 1rem;
  color: #003366;
}

.curso-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s ease-in-out;
  z-index: 100;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content,
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
  animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
  from { transform: translateY(-20px); }
  to { transform: translateY(0); }
}

.modal h2 {
  margin-top: 0;
  color: #003366;
  text-align: center;
}

.modal-content input,
.modal-content select {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.3s ease;
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

/* Tabla de Alumnos */
.alumnos-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.alumnos-table th,
.alumnos-table td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
  font-size: 14px;
}

.alumnos-table th {
  background: #003366;
  color: white;
  font-weight: bold;
}

.alumnos-scroll-container {
  max-height: 250px;
  overflow-y: auto;
  margin-top: 10px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

/* Subida de Archivo */
.file-upload-section {
  margin-top: 15px;
  padding: 0 10px;
}

/* Modal de Error */
.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.error-modal {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 2px solid #dc3545;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}

.error-modal h2 {
  color: #dc3545;
  margin-bottom: 10px;
}

.error-modal button {
  margin-top: 15px;
}

/* Responsivo */
@media (max-width: 768px) {
  .form-group,
  .filters-container,
  .form-container {
    flex-direction: column;
  }
}
</style>
