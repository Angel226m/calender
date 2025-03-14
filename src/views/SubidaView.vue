<template>
  <div class="file-manager">
    <!-- Sidebar: Carpetas -->
    <aside class="sidebar">
      <h2 class="sidebar-title">Carpetas</h2>
      <div class="folder-create">
        <input
          v-model="nuevaCarpeta"
          type="text"
          placeholder="Nueva carpeta"
          class="folder-input"
        />
        <button @click="crearCarpeta" class="folder-btn-create">
          <i class="mdi mdi-plus-circle"></i>
          Crear
        </button>
      </div>
      <ul class="folder-list">
        <!-- Muestra las carpetas que lleguen desde el backend (o las creadas localmente) -->
        <li
          v-for="(carpeta, index) in carpetas"
          :key="carpeta.id || index"
          @click="seleccionarCarpeta(carpeta)"
          :class="{ active: carpetaSeleccionada && carpetaSeleccionada.id === carpeta.id }"
        >
          <i class="mdi mdi-folder-outline"></i>
          <span>{{ carpeta.name }}</span>
        </li>
      </ul>
    </aside>

    <!-- Main: Área de archivos -->
    <main class="main-content">
      <!-- Sección de subida -->
      <section class="upload-section">
        <div
          class="drop-zone"
          @dragover.prevent
          @drop="manejarDrop"
          @click="abrirExplorador"
        >
          <p v-if="!archivos.length">
            Arrastra archivos o haz clic para seleccionar
          </p>
          <ul v-else class="preview-list">
            <li
              v-for="(archivo, index) in archivos"
              :key="index"
              class="preview-item"
            >
              <span>
                {{ archivo.name }} ({{ (archivo.size / 1024 / 1024).toFixed(2) }} MB)
              </span>
              <button @click.stop="eliminarArchivo(index)" class="btn-delete">
                <i class="mdi mdi-delete"></i>
              </button>
            </li>
          </ul>
        </div>
        <input
          type="file"
          ref="inputArchivo"
          @change="seleccionarArchivo"
          multiple
          class="hidden"
        />
        <button
          @click="subirArchivos"
          :disabled="archivos.length === 0 || subiendo || !carpetaSeleccionada"
          class="upload-btn"
        >
          {{ subiendo ? "Subiendo..." : "Subir Archivos" }}
        </button>
      </section>

      <!-- Sección de archivos en la carpeta -->
      <section class="files-section">
        <h2 class="files-title" v-if="carpetaSeleccionada">
          Archivos en "{{ carpetaSeleccionada.name }}"
        </h2>
        <p v-else class="files-title">
          Selecciona una carpeta para ver sus archivos.
        </p>
        <ul class="files-list">
          <li
            v-for="(file, index) in filesBySelectedFolder"
            :key="file.fileId"
            class="file-item"
          >
            <span class="file-name">
              {{ file.fileName.split('/').pop() }}
            </span>
            <div class="file-actions">
              <button @click="descargarArchivo(file)" class="btn-download">
                <i class="mdi mdi-download"></i>
                Descargar
              </button>
              <button
                @click="confirmarEliminacion(file, index)"
                class="btn-delete"
              >
                <i class="mdi mdi-delete"></i>
                Eliminar
              </button>
            </div>
          </li>
        </ul>
      </section>

      <p v-if="error" class="error-message">{{ error }}</p>
    </main>

    <!-- Modal de confirmación para eliminar -->
    <div v-if="modalEliminar.show" class="modal-fondo">
      <div class="modal-contenido">
        <h3>Confirmar eliminación</h3>
        <p>
          ¿Seguro que deseas eliminar
          <strong>{{ modalEliminar.fileName.split('/').pop() }}</strong>?
        </p>
        <div class="modal-botones">
          <button class="btn-cancelar" @click="cancelarEliminacion">
            Cancelar
          </button>
          <button class="btn-confirmar" @click="eliminarArchivoRemotoConfirmado">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SubidaView",
  data() {
    return {
      archivos: [],             // Archivos seleccionados para subir
      listadoArchivos: [],      // Archivos obtenidos del backend
      carpetas: [],             // Carpetas creadas por el usuario (desde backend simulado)
      nuevaCarpeta: "",
      carpetaSeleccionada: null,
      error: null,
      subiendo: false,
      modalEliminar: {
        show: false,            // Para mostrar/ocultar el modal de confirmación
        fileId: null,
        fileName: "",
        index: null
      },
      // Tipos permitidos
      tiposPermitidos: [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      maxSizeMB: 15,
    };
  },
  computed: {
    // Usuario global (incluye uid y token)
    user() {
      return this.$store.state.user;
    },
    // Headers de autorización
    authHeaders() {
      return this.user && this.user.token
        ? { Authorization: `Bearer ${this.user.token}` }
        : {};
    },
    // Filtra archivos según la carpeta seleccionada
    filesBySelectedFolder() {
      if (!this.carpetaSeleccionada) return [];
      return this.listadoArchivos.filter((file) => {
        const parts = file.fileName.split("/");
        const folder = parts[2] || "default";
        return folder === this.carpetaSeleccionada.name;
      });
    },
  },
  mounted() {
    if (this.user && this.user.uid) {
      this.obtenerCarpetas();
      this.listarArchivos();
    }
  },
  methods: {
    /* ---------------- Carpeta ---------------- */
    async crearCarpeta() {
      if (!this.nuevaCarpeta.trim()) return;
      if (!this.user || !this.user.uid || !this.user.token) {
        alert("❌ Usuario no autenticado.");
        return;
      }
      const nombre = this.nuevaCarpeta.trim();
      try {
        const response = await fetch("http://localhost:3000/folder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.authHeaders,
          },
          body: JSON.stringify({ name: nombre, uid: this.user.uid }),
        });
        const result = await response.json();
        if (result.success) {
          // Agrega la carpeta creada al arreglo
          this.carpetas.push(result.data);
          // Selecciona la carpeta recién creada
          this.carpetaSeleccionada = result.data;
          this.nuevaCarpeta = "";
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      }
    },
    async obtenerCarpetas() {
      if (!this.user || !this.user.uid || !this.user.token) return;
      try {
        const response = await fetch(
          `http://localhost:3000/folders?uid=${this.user.uid}`,
          { headers: this.authHeaders }
        );
        const result = await response.json();
        if (result.success) {
          // Se asume que el backend devuelve un arreglo con las carpetas
          this.carpetas = result.folders;
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      }
    },
    seleccionarCarpeta(carpeta) {
      this.carpetaSeleccionada = carpeta;
      this.listarArchivos();
    },

    /* ---------------- Subida de Archivos ---------------- */
    seleccionarArchivo(event) {
      const files = event.target.files;
      if (files) this.agregarArchivos(files);
    },
    manejarDrop(event) {
      event.preventDefault();
      const files = event.dataTransfer?.files;
      if (files?.length) this.agregarArchivos(files);
    },
    abrirExplorador() {
      this.$refs.inputArchivo.click();
    },
    agregarArchivos(files) {
      this.error = null;
      Array.from(files).forEach((file) => {
        if (!this.tiposPermitidos.includes(file.type)) {
          this.error = "❌ Tipo de archivo no permitido.";
          return;
        }
        if (file.size > this.maxSizeMB * 1024 * 1024) {
          this.error = `❌ ${file.name} supera el límite (${this.maxSizeMB} MB).`;
          return;
        }
        // Evitar archivos duplicados
        if (!this.archivos.some((f) => f.name === file.name)) {
          this.archivos.push(file);
        }
      });
    },
    eliminarArchivo(index) {
      this.archivos.splice(index, 1);
    },
    async subirArchivos() {
      if (!this.archivos.length || !this.carpetaSeleccionada) {
        alert("⚠️ Debes seleccionar archivos y una carpeta primero.");
        return;
      }
      if (!this.user || !this.user.uid || !this.user.token) {
        alert("❌ Usuario no autenticado.");
        return;
      }
      this.subiendo = true;
      for (const archivo of this.archivos) {
        const formData = new FormData();
        formData.append("archivo", archivo);
        formData.append("carpeta", this.carpetaSeleccionada.name);
        formData.append("uid", this.user.uid);
        try {
          const response = await fetch("http://localhost:3000/upload", {
            method: "POST",
            headers: {
              ...this.authHeaders,
            },
            body: formData,
          });
          const result = await response.json();
          if (result.success) {
            // Agregar el archivo subido a la lista de archivos
            this.listadoArchivos.push({
              name: archivo.name,
              fileName: result.data.fileName,
              fileId: result.data.fileId,
            });
          } else {
            this.error = `Error al subir ${archivo.name}: ${result.error}`;
          }
        } catch (err) {
          this.error = `Error al subir ${archivo.name}: ${err.message}`;
        }
      }
      alert(
        `✅ ${this.archivos.length} archivo(s) subido(s) a la carpeta "${this.carpetaSeleccionada.name}".`
      );
      this.archivos = [];
      this.subiendo = false;
    },

    /* ---------------- Listar/Descargar/Eliminar ---------------- */
    async listarArchivos() {
      if (!this.user || !this.user.uid || !this.user.token) return;
      try {
        const response = await fetch(
          `http://localhost:3000/files?uid=${this.user.uid}`,
          { headers: this.authHeaders }
        );
        const result = await response.json();
        if (result.success) {
          this.listadoArchivos = result.files;
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      }
    },
    async descargarArchivo(file) {
      if (!this.user || !this.user.uid || !this.user.token) return;
      try {
        const response = await fetch(
          `http://localhost:3000/download?fileName=${encodeURIComponent(
            file.fileName
          )}&uid=${this.user.uid}`,
          { headers: this.authHeaders }
        );
        const result = await response.json();
        if (result.success) {
          window.open(result.signedUrl, "_blank");
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      }
    },
    // Muestra el modal de confirmación para eliminar
    confirmarEliminacion(file, index) {
      this.modalEliminar.show = true;
      this.modalEliminar.fileId = file.fileId;
      this.modalEliminar.fileName = file.fileName;
      this.modalEliminar.index = index;
    },
    // Cancela la eliminación
    cancelarEliminacion() {
      this.modalEliminar.show = false;
      this.modalEliminar.fileId = null;
      this.modalEliminar.fileName = "";
      this.modalEliminar.index = null;
    },
    // Confirma y elimina el archivo remoto
    async eliminarArchivoRemotoConfirmado() {
      const { fileId, fileName, index } = this.modalEliminar;
      if (!this.user || !this.user.uid || !this.user.token) return;
      try {
        const response = await fetch(
          `http://localhost:3000/file?fileId=${fileId}&fileName=${encodeURIComponent(
            fileName
          )}&uid=${this.user.uid}`,
          {
            method: "DELETE",
            headers: this.authHeaders,
          }
        );
        const result = await response.json();
        if (result.success) {
          // Eliminar de la lista local
          this.listadoArchivos.splice(index, 1);
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        // Cerrar el modal de confirmación
        this.cancelarEliminacion();
      }
    },
  },
};
</script>

<style scoped>
/* Layout general */
.file-manager {
  display: flex;
  min-height: 80vh;
  font-family: "Arial", sans-serif;
}

/* Sidebar de carpetas */
.sidebar {
  flex: 0 0 250px;
  background: linear-gradient(135deg, #e6efff, #f0f4f8);
  padding: 1rem;
  border-right: 1px solid #ddd;
}
.sidebar-title {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  color: #003366;
}
.folder-create {
  display: flex;
  margin-bottom: 1rem;
}
.folder-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
}
.folder-btn-create {
  padding: 0.5rem 1rem;
  border: none;
  background: linear-gradient(135deg, #00509e, #003366);
  color: #fff;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s;
}
.folder-btn-create i {
  font-size: 1.2rem;
  margin-right: 4px;
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
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
  color: #003366;
}
.folder-list li i {
  font-size: 1.2rem;
}
.folder-list li.active,
.folder-list li:hover {
  background: #00509e;
  color: #fff;
}

/* Área principal */
.main-content {
  flex: 1;
  padding: 1.5rem;
}

/* Sección de subida de archivos */
.upload-section {
  margin-bottom: 2rem;
}
.drop-zone {
  border: 2px dashed #00509e;
  border-radius: 4px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  background: #f9f9f9;
}
.preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid #eee;
}
.upload-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #00509e, #003366);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  transition: background 0.3s;
}
.upload-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
.upload-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #003366, #00509e);
}

/* Sección de archivos */
.files-section {
  background: #fff;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.files-title {
  margin-top: 0;
  font-size: 1.3rem;
  color: #003366;
}
.files-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding: 0.5rem 0;
}
.file-actions button {
  margin-left: 0.5rem;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: background 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-download {
  background: #2ecc71;
  color: #fff;
}
.btn-download:hover {
  background: #27ae60;
}
.btn-delete {
  background: #e74c3c;
  color: #fff;
}
.btn-delete:hover {
  background: #c0392b;
}

/* Modal de confirmación */
.modal-fondo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-contenido {
  background-color: #fff;
  width: 320px;
  max-width: 90%;
  padding: 1rem;
  border-radius: 4px;
}
.modal-contenido h3 {
  margin-top: 0;
}
.modal-botones {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
.btn-cancelar {
  background: #bdc3c7;
  color: #2c3e50;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
.btn-confirmar {
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
.btn-confirmar:hover {
  background: #c0392b;
}

/* Otros */
.error-message {
  color: #e74c3c;
  font-size: 1rem;
  margin-top: 1rem;
}
.hidden {
  display: none;
}
</style>
