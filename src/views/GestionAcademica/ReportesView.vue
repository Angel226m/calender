<template>
  <div class="app-container">
    <h1 class="title"><i class="mdi mdi-school"></i> Registro de Notas</h1>

    <!-- Selección de curso -->
    <div class="select-course">
      <select v-model="cursoSeleccionado" class="select-field">
        <option disabled value="">Seleccione un curso</option>
        <option v-for="curso in cursos" :key="curso.id" :value="curso.id">
          {{ curso.nombre }} - {{ curso.seccion }}
        </option>
      </select>
    </div>

    <!-- Botón para abrir modal de configuración de evaluaciones -->
    <div v-if="cursoSeleccionado" class="config-btn-container">
      <button @click="abrirModalConfiguracion" class="btn btn-secondary">
        <i class="mdi mdi-settings"></i> Configurar Evaluaciones
      </button>
    </div>

    <!-- Modal de Configuración de Evaluaciones -->
    <div v-if="mostrarModalConfiguracion" class="modal-overlay" @click="cerrarModalConfiguracion">
      <div class="modal" @click.stop>
        <h2 class="modal-title"><i class="mdi mdi-pencil-box"></i> Configurar Evaluaciones</h2>
        <table class="config-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre de Evaluación</th>
              <th>Peso (%)</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tipo, idx) in configuracionEvaluacion" :key="idx">
              <td>{{ idx + 1 }}</td>
              <td>
                <input type="text" v-model="configuracionEvaluacion[idx].nombre" class="config-input" placeholder="Ej: Clase 1" />
              </td>
              <td>
                <input type="number" v-model.number="configuracionEvaluacion[idx].peso" class="config-input" min="0" max="100" />
              </td>
              <td>
                <button class="btn btn-delete" @click="eliminarTipo(idx)">
                  <i class="mdi mdi-delete"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="btn btn-secondary" @click="agregarTipo">
          <i class="mdi mdi-plus-circle"></i> Agregar Evaluación
        </button>
        <div class="modal-buttons">
          <button @click="guardarConfiguracionEvaluacion" class="btn btn-primary">
            <i class="mdi mdi-content-save"></i> Guardar Configuración
          </button>
          <button @click="cerrarModalConfiguracion" class="btn btn-cancel">
            <i class="mdi mdi-close-circle"></i> Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de Notas para Alumnos -->
    <div v-if="cursoSeleccionadoData.alumnos && cursoSeleccionadoData.alumnos.length" class="notas-container">
      <h2 class="sub-title">
        <i class="mdi mdi-account-group"></i>
        Notas del curso: {{ cursoSeleccionadoData.nombre }} - {{ cursoSeleccionadoData.seccion }}
      </h2>
      <table class="notas-table">
        <thead>
          <tr>
            <th>Alumno</th>
            <th v-for="(tipo, idx) in configuracionEvaluacion" :key="idx">{{ tipo.nombre }}</th>
            <th>Promedio</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="alumno in cursoSeleccionadoData.alumnos" :key="alumno.dni">
            <td>{{ alumno.nombre }} {{ alumno.apellido }}</td>
            <td v-for="(tipo, idx) in configuracionEvaluacion" :key="idx">
              <input
                type="number"
                min="0"
                max="20"
                class="nota-input"
                v-model.number="notasAlumnos[alumno.dni]['tipo' + idx]"
                @blur="actualizarPromedio(alumno.dni)"
              />
            </td>
            <td>
              <input
                type="number"
                min="0"
                max="20"
                class="nota-input"
                v-model.number="notasAlumnos[alumno.dni].promedio"
                readonly
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div class="button-group">
        <button @click="guardarNotas" class="btn btn-primary">
          <i class="mdi mdi-content-save"></i> Guardar Notas
        </button>
        <button @click="exportarCSV" class="btn btn-secondary">
          <i class="mdi mdi-file-export"></i> Exportar CSV
        </button>
      </div>
    </div>

    <!-- Modal de Mensaje (Error o Éxito) -->
    <div v-if="mensajeModal" class="mensaje-modal-overlay" @click="cerrarMensajeModal">
      <div class="mensaje-modal" @click.stop>
        <h2>{{ mensajeModal.titulo }}</h2>
        <p>{{ mensajeModal.texto }}</p>
        <button @click="cerrarMensajeModal" class="btn btn-close">Cerrar</button>
      </div>
    </div>

    <!-- Mensaje de error general -->
    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>
  </div>
</template>

<script>
import { db, auth } from "@/services/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export default {
  name: "NotasView",
  data() {
    return {
      cursoSeleccionado: "",
      cursos: [],
      configuracionEvaluacion: [],
      notasAlumnos: {},
      mensajeModal: null, // { titulo, texto }
      mostrarModalConfiguracion: false,
      mensajeError: ""
    };
  },
  computed: {
    // Devuelve el curso seleccionado con sus datos completos o un objeto vacío
    cursoSeleccionadoData() {
      return this.cursos.find(curso => curso.id === this.cursoSeleccionado) || { alumnos: [] };
    }
  },
  async created() {
    await this.cargarCursos();
  },
  watch: {
    cursoSeleccionado(newVal) {
      if (newVal) {
        const curso = this.cursoSeleccionadoData;
        // Si el curso ya tiene configuracionEvaluacion, la usamos; si no, la dejamos vacía
        this.configuracionEvaluacion = curso.configuracionEvaluacion && curso.configuracionEvaluacion.length > 0
          ? curso.configuracionEvaluacion
          : [];
        // Inicializamos las notas para cada alumno
        curso.alumnos.forEach(alumno => {
          if (!this.notasAlumnos[alumno.dni]) {
            this.$set(this.notasAlumnos, alumno.dni, alumno.notas ? { ...alumno.notas } : {});
          }
          this.configuracionEvaluacion.forEach((tipo, idx) => {
            if (this.notasAlumnos[alumno.dni]['tipo' + idx] === undefined) {
              this.$set(this.notasAlumnos[alumno.dni], 'tipo' + idx, "");
            }
          });
          if (this.notasAlumnos[alumno.dni].promedio === undefined) {
            this.$set(this.notasAlumnos[alumno.dni], "promedio", "");
          }
        });
      }
    }
  },
  methods: {
    async cargarCursos() {
      try {
        // Filtrar cursos por el usuario actual
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");
        const querySnapshot = await getDocs(collection(db, "cursos"));
        // Filtra manualmente si en Firestore no usas reglas o query; se recomienda usar query con where("userId", "==", currentUser.uid)
        this.cursos = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(curso => curso.userId === currentUser.uid);
      } catch (error) {
        console.error("Error al cargar cursos:", error);
        this.mensajeError = "Error al cargar cursos.";
      }
    },
    abrirModalConfiguracion() {
      this.mostrarModalConfiguracion = true;
    },
    cerrarModalConfiguracion() {
      this.mostrarModalConfiguracion = false;
    },
    async guardarConfiguracionEvaluacion() {
      const sumaPesos = this.configuracionEvaluacion.reduce((acc, tipo) => acc + Number(tipo.peso), 0);
      if (sumaPesos !== 100) {
        this.mostrarMensaje("Error", "La suma de los pesos debe ser 100.");
        return;
      }
      try {
        const cursoRef = doc(db, "cursos", this.cursoSeleccionado);
        await updateDoc(cursoRef, { configuracionEvaluacion: this.configuracionEvaluacion });
        this.mostrarMensaje("Éxito", "Configuración guardada correctamente.");
        this.cerrarModalConfiguracion();
      } catch (error) {
        console.error("Error al guardar configuración:", error);
        this.mostrarMensaje("Error", "Error al guardar configuración.");
      }
    },
    agregarTipo() {
      this.configuracionEvaluacion.push({ nombre: "", peso: 0 });
    },
    eliminarTipo(idx) {
      this.configuracionEvaluacion.splice(idx, 1);
    },
    actualizarPromedio(dni) {
      const notas = this.notasAlumnos[dni];
      let suma = 0;
      let totalPeso = 0;
      this.configuracionEvaluacion.forEach((tipo, idx) => {
        const nota = parseFloat(notas['tipo' + idx]);
        const peso = parseFloat(tipo.peso);
        if (!isNaN(nota) && !isNaN(peso)) {
          suma += nota * peso;
          totalPeso += peso;
        }
      });
      const promedio = totalPeso > 0 ? (suma / totalPeso).toFixed(2) : "";
      this.$set(this.notasAlumnos[dni], "promedio", promedio);
    },
    async guardarNotas() {
      try {
        const curso = this.cursoSeleccionadoData;
        if (!curso || !curso.alumnos.length) {
          this.mostrarMensaje("Error", "No hay alumnos para actualizar.");
          return;
        }
        // Validar que ninguna nota supere 20
        for (const alumno of curso.alumnos) {
          const notas = this.notasAlumnos[alumno.dni] || {};
          for (const key in notas) {
            if (key !== "promedio" && parseFloat(notas[key]) > 20) {
              this.mostrarMensaje("Error", "Las notas deben estar entre 0 y 20.");
              return;
            }
          }
        }
        const alumnosActualizados = curso.alumnos.map(alumno => {
          const notas = this.notasAlumnos[alumno.dni] || {};
          return {
            ...alumno,
            notas: { ...notas }
          };
        });
        const cursoRef = doc(db, "cursos", this.cursoSeleccionado);
        await updateDoc(cursoRef, { alumnos: alumnosActualizados });
        this.mostrarMensaje("Éxito", "Notas actualizadas correctamente.");
      } catch (error) {
        console.error("Error al guardar notas:", error);
        this.mostrarMensaje("Error", "Error al guardar notas.");
      }
    },
    exportarCSV() {
      let csvContent = "Curso,Nombre,Apellido";
      this.configuracionEvaluacion.forEach(tipo => {
        csvContent += `,${tipo.nombre}`;
      });
      csvContent += ",Promedio\n";
      const curso = this.cursoSeleccionadoData;
      curso.alumnos.forEach(alumno => {
        const notas = this.notasAlumnos[alumno.dni] || {};
        csvContent += `${curso.nombre} - ${curso.seccion},${alumno.nombre},${alumno.apellido}`;
        this.configuracionEvaluacion.forEach((tipo, idx) => {
          csvContent += `,${notas['tipo' + idx] || ""}`;
        });
        csvContent += `,${notas.promedio || ""}\n`;
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "reporte_notas.csv";
      link.click();
    },
    mostrarMensaje(titulo, texto) {
      this.mensajeModal = { titulo, texto };
    },
    cerrarMensajeModal() {
      this.mensajeModal = null;
    }
  }
};
</script>


<style scoped>
/* Diseño General */
.app-container {
  max-width: 1200px;
  margin: auto;
  background: #fff;
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
}
.title {
  text-align: center;
  color: #003366;
  font-size: 2.8rem;
  font-weight: bold;
  margin-bottom: 20px;
  border-bottom: 3px solid #00509e;
  padding-bottom: 10px;
}

/* Select y Campos de Entrada */
.select-course {
  margin-bottom: 20px;
}
.select-field,
.input-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 10px;
}
.select-field:focus,
.input-field:focus {
  border-color: #00509e;
  outline: none;
}

/* Configuración de Evaluaciones */
.config-container {
  margin-bottom: 20px;
}
.config-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.config-table th,
.config-table td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: center;
}
.config-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.options-container,
.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.weight-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}
.weight-input:focus {
  border-color: #00509e;
  outline: none;
}

/* Modal de Configuración */
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
.modal-title {
  text-align: center;
  color: #003366;
  margin-bottom: 15px;
}
.modal-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

/* Tabla de Notas */
.notas-container {
  margin-top: 30px;
}
.sub-title {
  color: #003366;
  font-size: 1.8rem;
  margin-bottom: 15px;
}
.notas-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
.notas-table th,
.notas-table td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: center;
}
.notas-table th {
  background: #f3f3f3;
  color: #003366;
}
.nota-input {
  width: 80px;
  padding: 5px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Botones */
.button-group {
  text-align: center;
  margin-bottom: 20px;
}
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

/* Modal de Mensaje */
.mensaje-modal-overlay {
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
.mensaje-modal {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 2px solid #00509e;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}
.mensaje-modal h2 {
  margin-bottom: 10px;
}
.mensaje-modal button {
  margin-top: 15px;
}
</style>
