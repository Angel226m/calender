<template>
  <div class="app-container">
    <h1 class="title">📝 Registro de Notas</h1>
    <div class="main-layout">
      <!-- Sidebar: Carpetas -->
      <aside class="sidebar">
        <h2 class="sidebar-title">Carpetas</h2>
        <div class="folder-create">
          <input
            v-model.trim="nuevaCarpeta"
            placeholder="Nueva carpeta"
            class="folder-input"
            @keyup.enter="crearFolder"
          />
          <button @click="crearFolder" class="btn folder-btn-create">
            <i class="mdi mdi-plus-circle"></i>
            Crear
          </button>
        </div>
        <ul class="folder-list">
          <li
            v-for="folder in folders"
            :key="folder.id"
            @click="seleccionarFolder(folder)"
            :class="{ active: selectedFolder && selectedFolder.id === folder.id }"
          >
            <i class="mdi mdi-folder-outline"></i>
            <span>{{ folder.name }}</span>
          </li>
        </ul>
      </aside>

      <!-- Área de Notas -->
      <main class="notes-content">
        <div class="notes-header">
          <input
            v-model="busqueda"
            placeholder="🔍 Buscar nota..."
            class="search-bar"
            @keyup.enter="buscarNota"
          />
          <button @click="abrirModalNota" class="btn add-btn">
            <i class="mdi mdi-plus"></i>
            Agregar Nota
          </button>
        </div>
        <ul v-if="notasFiltradas.length" class="notas-list scrollable">
          <li v-for="nota in notasFiltradas" :key="nota.id" class="nota">
            <span class="note-text">{{ nota.texto }}</span>
            <span class="badge">{{ obtenerCategoria(nota.categoria) }}</span>
            <div class="nota-actions">
              <button @click="editarNota(nota)" class="btn edit-btn">
                <i class="mdi mdi-pencil"></i>
              </button>
              <button @click="eliminarNota(nota.id)" class="btn delete-btn">
                <i class="mdi mdi-delete"></i>
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="no-notas">🚀 No hay notas disponibles.</p>
      </main>
    </div>

    <!-- Modal para Agregar/Editar Nota con transición -->
    <transition name="fade">
      <div v-if="mostrarModalNota" class="modal-overlay" @click="cerrarModalNota">
        <div class="modal-content" @click.stop>
          <h2 class="modal-title">
            {{ notaSeleccionada ? "Editar Nota" : "Agregar Nota" }}
          </h2>
          <textarea
            v-model.trim="notaTemporal"
            placeholder="Escribe tu nota aquí..."
            class="modal-textarea"
          ></textarea>
          <select v-model="categoriaTemporal" class="modal-select">
            <option value="general">📂 General</option>
            <option value="importante">⭐ Importante</option>
            <option value="tareas">✅ Tareas</option>
          </select>
          <div class="modal-buttons">
            <button @click="guardarNota" class="btn add-btn">
              <i class="mdi mdi-content-save"></i>
              Guardar
            </button>
            <button @click="cerrarModalNota" class="btn cancel-btn">
              <i class="mdi mdi-close-circle"></i>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Mensaje de error con animación -->
    <transition name="slide">
      <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>
    </transition>
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

export default {
  name: "NotasView",
  data() {
    return {
      nuevaCarpeta: "",
      folders: [],
      selectedFolder: null,
      busqueda: "",
      notas: [],
      mostrarModalNota: false,
      notaTemporal: "",
      categoriaTemporal: "general",
      notaSeleccionada: null, // Guarda la nota seleccionada para editar
      mensajeError: "",
      mensajeModal: null // { titulo, texto }
    };
  },
  computed: {
    // Filtra las notas según la búsqueda y la carpeta seleccionada
    notasFiltradas() {
      let filtered = this.notas.filter(nota =>
        nota.texto.toLowerCase().includes(this.busqueda.toLowerCase())
      );
      if (this.selectedFolder) {
        filtered = filtered.filter(nota => nota.folderId === this.selectedFolder.id);
      }
      return filtered;
    },
    selectedFolderData() {
      return this.folders.find(folder => folder.id === this.selectedFolder?.id) || {};
    }
  },
  async created() {
    await this.cargarFolders();
    await this.cargarNotas();
  },
  methods: {
    async cargarFolders() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");
        const foldersRef = collection(db, "folders");
        const q = query(foldersRef, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        this.folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error al cargar carpetas:", error);
        this.mensajeError = "Error al cargar carpetas.";
      }
    },
    async crearFolder() {
      if (!this.nuevaCarpeta.trim()) {
        this.mensajeError = "Escribe un nombre para la carpeta.";
        setTimeout(() => (this.mensajeError = ""), 2000);
        return;
      }
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");
        const docRef = await addDoc(collection(db, "folders"), {
          name: this.nuevaCarpeta.trim(),
          userId: currentUser.uid
        });
        this.folders.push({ id: docRef.id, name: this.nuevaCarpeta.trim(), userId: currentUser.uid });
        this.nuevaCarpeta = "";
      } catch (error) {
        console.error("Error al crear carpeta:", error);
        this.mensajeError = "Error al crear carpeta.";
      }
    },
    seleccionarFolder(folder) {
      this.selectedFolder = folder;
      this.cargarNotas();
    },
    async cargarNotas() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");
        const notasRef = collection(db, "notas");
        const q = query(notasRef, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        this.notas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error al cargar notas:", error);
        this.mensajeError = "Error al cargar notas.";
      }
    },
    abrirModalNota() {
      if (!this.selectedFolder) {
        this.mensajeError = "Selecciona una carpeta para agregar notas.";
        setTimeout(() => (this.mensajeError = ""), 2000);
        return;
      }
      this.notaTemporal = "";
      this.categoriaTemporal = "general";
      this.notaSeleccionada = null;
      this.mostrarModalNota = true;
    },
    cerrarModalNota() {
      this.mostrarModalNota = false;
      this.notaTemporal = "";
      this.categoriaTemporal = "general";
      this.notaSeleccionada = null;
    },
    async guardarNota() {
      if (!this.notaTemporal.trim()) {
        this.mensajeError = "Escribe algo antes de guardar la nota.";
        setTimeout(() => (this.mensajeError = ""), 2000);
        return;
      }
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuario no autenticado");
        if (this.notaSeleccionada) {
          await updateDoc(doc(db, "notas", this.notaSeleccionada.id), {
            texto: this.notaTemporal.trim(),
            categoria: this.categoriaTemporal
          });
          const index = this.notas.findIndex(nota => nota.id === this.notaSeleccionada.id);
          if (index !== -1) {
            this.notas.splice(index, 1, {
              ...this.notaSeleccionada,
              texto: this.notaTemporal.trim(),
              categoria: this.categoriaTemporal
            });
          }
        } else {
          const nuevaNota = {
            texto: this.notaTemporal.trim(),
            categoria: this.categoriaTemporal,
            folderId: this.selectedFolder.id,
            timestamp: new Date().getTime(),
            userId: currentUser.uid
          };
          const docRef = await addDoc(collection(db, "notas"), nuevaNota);
          this.notas.unshift({ id: docRef.id, ...nuevaNota });
        }
        this.cerrarModalNota();
      } catch (error) {
        console.error("Error al guardar nota:", error);
        this.mensajeError = "Error al guardar nota.";
      }
    },
    async eliminarNota(id) {
      try {
        await deleteDoc(doc(db, "notas", id));
        this.notas = this.notas.filter(nota => nota.id !== id);
      } catch (error) {
        console.error("Error al eliminar nota:", error);
        this.mensajeError = "Error al eliminar nota.";
      }
    },
    obtenerCategoria(categoria) {
      return {
        general: "📂 General",
        importante: "⭐ Importante",
        tareas: "✅ Tareas"
      }[categoria] || "📂 General";
    },
    buscarNota() {
      if (!this.busqueda.trim()) {
        this.mensajeError = "Ingresa un término de búsqueda.";
        setTimeout(() => (this.mensajeError = ""), 2000);
      }
    },
    exportarCSV() {
      // Implementación de exportación a CSV (según tus necesidades)
    },
    // Métodos para mensajes
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
/* Estilos generales */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: Arial, sans-serif;
  background: #eef2f7;
  color: #333;
}

/* Eliminamos restricciones para usar todo el ancho */
.app-container {
  width: 100%;
  padding: 30px 20px;
  background: #fff;
}

/* Título principal */
.title {
  text-align: center;
  font-size: 2.5rem;
  color: #003366;
  font-weight: bold;
  margin-bottom: 30px;
  border-bottom: 3px solid #00509e;
  padding-bottom: 10px;
  animation: slideIn 1s ease-out;
}

/* Layout principal */
.main-layout {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  animation: fadeIn 1s ease-out;
}

/* Sidebar: Carpetas */
.sidebar {
  flex: 1 1 250px;
  background: linear-gradient(135deg, #e6efff, #f0f4f8);
  padding: 20px;
  border: 1px solid #bdd3f0;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: transform 0.3s;
}
.sidebar:hover {
  transform: translateY(-5px);
}
.sidebar-title {
  font-size: 1.8rem;
  color: #003366;
  margin-bottom: 15px;
  text-align: center;
}
.folder-create {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.folder-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px 0 0 6px;
}
.folder-btn-create {
  padding: 10px 15px;
  border: none;
  background: linear-gradient(135deg, #00509e, #003366);
  color: #fff;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s;
}
.folder-btn-create:hover {
  background: linear-gradient(135deg, #003366, #00509e);
  transform: scale(1.03);
}
.folder-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.folder-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
  color: #003366;
}
.folder-list li i {
  font-size: 1.2rem;
}
.folder-list li:hover,
.folder-list li.active {
  background: #00509e;
  color: #fff;
}

/* Área de Notas */
.notes-content {
  flex: 2 1 500px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: transform 0.3s;
}
.notes-content:hover {
  transform: translateY(-3px);
}
.notes-header {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.search-bar {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}
.add-btn {
  background: linear-gradient(135deg, #003366, #00509e);
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s;
}
.add-btn:hover {
  background: linear-gradient(135deg, #00509e, #003366);
  transform: scale(1.03);
}
.notas-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.nota {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, background 0.2s;
}
.nota:hover {
  transform: scale(1.02);
  background: #f0f8ff;
}
.nota-actions {
  display: flex;
  gap: 5px;
}
.badge {
  font-size: 12px;
  padding: 3px 6px;
  background: #ccc;
  border-radius: 4px;
}

/* Modal para Agregar/Editar Nota */
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
  z-index: 100;
  animation: fadeIn 0.5s;
}
.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  border: 2px solid #00509e;
  animation: slideDown 0.5s;
}
.modal-title {
  font-size: 1.8rem;
  color: #003366;
  margin-bottom: 15px;
  text-align: center;
}
.modal-textarea {
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  transition: border 0.3s;
}
.modal-textarea:focus {
  border-color: #00509e;
  outline: none;
}
.modal-select {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.3s;
}
.modal-select:focus {
  border-color: #00509e;
  outline: none;
}
.modal-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

/* Mensaje de error */
.error-message {
  color: red;
  text-align: center;
  margin-top: 15px;
  animation: slideDown 0.5s;
}

/* Scrollbars Personalizados */
.scrollable {
  scrollbar-width: thin;
  scrollbar-color: #00509e #eef2f7;
}
.scrollable::-webkit-scrollbar {
  width: 8px;
}
.scrollable::-webkit-scrollbar-track {
  background: #eef2f7;
  border-radius: 6px;
}
.scrollable::-webkit-scrollbar-thumb {
  background-color: #00509e;
  border-radius: 6px;
}

/* Responsive */
@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }
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
@keyframes slideIn {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Transiciones para mensajes y modal */
.slide-enter-active, .slide-leave-active {
  transition: all 0.5s;
}
.slide-enter, .slide-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
