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
              <span>{{ archivo.name }} ({{ (archivo.size/1024/1024).toFixed(2) }} MB)</span>
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

      <section v-if="carpetaSeleccionada" class="files-section">
        <h2 class="files-title">Archivos en "{{ carpetaSeleccionada.name }}"</h2>
        <ul class="files-list">
          <li
            v-for="(file, index) in filesBySelectedFolder"
            :key="file.fileId"
            class="file-item"
          >
            <span class="file-name">{{ file.fileName.split('/').pop() }}</span>
            <div class="file-actions">
              <button @click="descargarArchivo(file)" class="btn-download">
                <i class="mdi mdi-download"></i>
                Descargar
              </button>
              <button @click="eliminarArchivoRemoto(file, index)" class="btn-delete">
                <i class="mdi mdi-delete"></i>
                Eliminar
              </button>
            </div>
          </li>
        </ul>
      </section>

      <p v-if="error" class="error-message">{{ error }}</p>
    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      archivos: [],           // Archivos seleccionados para subir
      listadoArchivos: [],    // Archivos consultados desde el backend (ya subidos)
      carpetas: [],           // Carpetas obtenidas de la BD
      nuevaCarpeta: "",
      carpetaSeleccionada: null, // Objeto de carpeta seleccionado (ej. { id, name })
      error: null,
      subiendo: false,
      // Validación de tipos y tamaño
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
    // Filtra los archivos según la carpeta seleccionada (basado en "archivos/<carpeta>/<nombreArchivo>")
    filesBySelectedFolder() {
      if (!this.carpetaSeleccionada) return [];
      return this.listadoArchivos.filter(file => {
        const parts = file.fileName.split('/');
        const folder = parts[1] || "default";
        return folder === this.carpetaSeleccionada.name;
      });
    },
  },
  mounted() {
    this.obtenerCarpetas();
    this.listarArchivos();
  },
  methods: {
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
      Array.from(files).forEach(file => {
        if (!this.tiposPermitidos.includes(file.type)) {
          this.error = "❌ Tipo de archivo no permitido.";
          return;
        }
        if (file.size > this.maxSizeMB * 1024 * 1024) {
          this.error = `❌ ${file.name} supera el límite (${this.maxSizeMB} MB).`;
          return;
        }
        if (!this.archivos.some(f => f.name === file.name)) {
          this.archivos.push(file);
        }
      });
    },
    eliminarArchivo(index) {
      this.archivos.splice(index, 1);
    },
    // Crea la carpeta mediante POST a /folder
    async crearCarpeta() {
      if (!this.nuevaCarpeta.trim()) return;
      const nombre = this.nuevaCarpeta.trim();
      try {
        const response = await fetch("http://localhost:3000/folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nombre }),
        });
        const result = await response.json();
        if (result.success) {
          this.carpetas.push(result.data);
          this.nuevaCarpeta = "";
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      }
    },
    // Obtiene las carpetas mediante GET a /folders
    async obtenerCarpetas() {
      try {
        const response = await fetch("http://localhost:3000/folders");
        const result = await response.json();
        if (result.success) {
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
      // Al seleccionar una carpeta, se actualiza la lista de archivos
      this.listarArchivos();
    },
    // Sube archivos al backend usando la carpeta seleccionada (se envía "carpeta" en el formData)
    async subirArchivos() {
      if (!this.archivos.length || !this.carpetaSeleccionada) {
        alert("⚠️ Selecciona archivos y una carpeta.");
        return;
      }
      this.subiendo = true;
      for (const archivo of this.archivos) {
        const formData = new FormData();
        formData.append("archivo", archivo);
        formData.append("carpeta", this.carpetaSeleccionada.name);
        try {
          const response = await fetch("http://localhost:3000/upload", {
            method: "POST",
            body: formData,
          });
          const result = await response.json();
          if (result.success) {
            this.listadoArchivos.push({
              name: archivo.name,
              fileName: result.data.fileName, // Ejemplo: "archivos/<carpeta>/<nombreArchivo>"
              fileId: result.data.fileId,
            });
          } else {
            this.error = `Error al subir ${archivo.name}: ${result.error}`;
          }
        } catch (err) {
          this.error = `Error al subir ${archivo.name}: ${err.message}`;
        }
      }
      alert(`✅ ${this.archivos.length} archivo(s) subido(s) a "${this.carpetaSeleccionada.name}".`);
      this.archivos = [];
      this.subiendo = false;
    },
    // Lista archivos mediante GET a /files
    async listarArchivos() {
      try {
        const response = await fetch("http://localhost:3000/files");
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
    // Descarga archivo solicitando URL firmada en /download
    async descargarArchivo(file) {
      try {
        const response = await fetch(`http://localhost:3000/download?fileName=${encodeURIComponent(file.fileName)}`);
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
    // Elimina archivo mediante DELETE a /file
    async eliminarArchivoRemoto(file, index) {
      try {
        const response = await fetch(`http://localhost:3000/file?fileId=${file.fileId}&fileName=${encodeURIComponent(file.fileName)}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) {
          this.listadoArchivos.splice(index, 1);
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = err.message;
      }
    },
  },
};
</script>

<style scoped>
/* Distribución en dos columnas: sidebar y contenido principal */
.file-manager {
  display: flex;
  min-height: 80vh;
  font-family: 'Arial', sans-serif;
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

.error-message {
  color: #e74c3c;
  font-size: 1rem;
  margin-top: 1rem;
}

.hidden {
  display: none;
}
</style>
