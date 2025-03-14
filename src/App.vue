<template>
  <v-app>
    <!-- Vista de Login: Se muestra si el usuario no está autenticado -->
    <div v-if="!user" class="login-wrapper">
      <v-container class="login-container">
        <v-card class="login-card zoomIn" outlined>
          <!-- Logo más grande y centrado con efecto bounce -->
          <v-img
            :src="loginLogo"
            class="login-logo bounce"
            height="180"
            contain
          ></v-img>

          <v-card-text class="text-center mt-4">
            <v-btn
              class="google-btn pulse-hover"
              @click="loginWithGoogle"
              :loading="loadingGoogle"
              large
            >
              <v-icon left>mdi-google</v-icon>
              Ingresar con Google
            </v-btn>
            <v-alert
              v-if="error"
              type="error"
              dismissible
              class="mt-4 animated"
            >
              {{ error }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="justify-center animated">
            <span class="caption">
              Al continuar, aceptas nuestros términos y condiciones.
            </span>
          </v-card-actions>
        </v-card>
      </v-container>
    </div>

    <!-- Layout Principal: Si el usuario está autenticado -->
    <div v-else>
      <!-- Sidebar (Menú lateral) con mini-variant y animaciones mejoradas -->
      <v-navigation-drawer
        app
        class="custom-drawer animated slideInLeft"
        dark
        width="250"
        clipped
        :mini-variant="miniVariant"
      >
        <!-- Encabezado del sidebar: ahora solo incluye el botón para contraer/expandir -->
        <div class="drawer-header">
          <v-btn icon class="toggle-btn" @click="toggleDrawer">
            <v-icon>{{ miniVariant ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
          </v-btn>
        </div>

        <v-list dense>
          <!-- Datos del usuario (solo en modo expandido) -->
          <v-list-item class="user-info" v-if="!miniVariant">
            <v-list-item-avatar>
              <v-img :src="user.photoURL || 'https://via.placeholder.com/50'" />
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>
                {{ user.displayName || user.email }}
              </v-list-item-title>
              <v-list-item-subtitle>Profesor</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-divider v-if="!miniVariant"></v-divider>

          <!-- Menú principal -->
          <v-list-item-group v-model="selectedRoute" active-class="active-list-item">
            <v-list-item
              v-for="item in menuItems"
              :key="item.route"
              @click="goTo(item.route)"
              :value="item.route"
              class="menu-item animated fadeIn"
            >
              <v-list-item-icon>
                <v-icon>{{ item.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content v-if="!miniVariant">
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <!-- Opción para cerrar sesión -->
            <v-list-item @click="logout" class="menu-item animated fadeIn">
              <v-list-item-icon>
                <v-icon>mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-content v-if="!miniVariant">
                <v-list-item-title>Cerrar Sesión</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-navigation-drawer>

      <!-- Contenido principal -->
      <v-main @click="collapseDrawer">
        <div class="main-content-wrapper" @click="collapseDrawer">
          <router-view />
        </div>
      </v-main>
    </div>
  </v-app>
</template>

<script>
import { auth } from "@/services/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import loginLogo from "@/Store/Diseño sin título (4).png";

export default {
  name: "App",
  data() {
    return {
      error: "",
      loadingGoogle: false,
      userRole: "Profesor",
      miniVariant: false,
      menuItems: [
        { title: "Inicio", icon: "mdi-view-dashboard", route: "/" },
        { title: "Calendario", icon: "mdi-calendar-clock", route: "/calendario" },
        { title: "Subida de Archivos", icon: "mdi-folder-upload", route: "/subida" },
        { title: "Notas", icon: "mdi-note-multiple", route: "/notas" },
        { title: "Informes", icon: "mdi-chart-line", route: "/informes" },
      ],
      selectedRoute: this.$route.path,
      loginLogo,
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
  },
  watch: {
    user(newVal) {
      if (newVal && this.$route.path === "/login") {
        this.$router.push("/");
      }
    },
    "$route.path"(newPath) {
      this.selectedRoute = newPath;
    },
  },
  created() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Obtén el token de Firebase de forma asíncrona
        const token = await user.getIdToken();
        // Actualiza el store con la información del usuario y el token
        this.$store.commit("setUser", { ...user, token });
        if (this.$route.path === "/login") {
          this.$router.push("/");
        }
      } else {
        this.$store.commit("setUser", null);
      }
    });
  },
  methods: {
    async loginWithGoogle() {
      this.error = "";
      this.loadingGoogle = true;
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loadingGoogle = false;
      }
    },
    goTo(route) {
      if (this.$route.path !== route) {
        this.$router.push(route);
      }
    },
    async logout() {
      try {
        await signOut(auth);
        this.$store.commit("setUser", null);
        this.$router.push("/login");
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
      }
    },
    toggleDrawer() {
      this.miniVariant = !this.miniVariant;
    },
    collapseDrawer() {
      if (!this.miniVariant) {
        this.miniVariant = true;
      }
    },
  },
};
</script>

<style scoped>
/* Animaciones adicionales */
@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.animated {
  animation: fadeInUp 0.8s ease-out both;
}
.zoomIn {
  animation: zoomIn 0.8s ease-out both;
}
.bounce {
  animation: bounce 2s infinite;
}
.pulse-hover:hover {
  animation: pulse 0.6s ease-in-out;
}

/* Fondo global para el login */
.login-wrapper {
  background: linear-gradient(to right, #2c3e50, #bdc3c7);
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 400px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
  background-color: #fff;
}
.login-logo {
  margin: 0 auto 16px auto;
  display: block;
}

/* Botón de Google */
.google-btn {
  background-color: #4285f4 !important;
  color: #fff !important;
  text-transform: none !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  letter-spacing: 0.5px;
  transition: background-color 0.3s, transform 0.3s;
}
.google-btn:hover {
  background-color: #357ae8 !important;
  transform: scale(1.03);
}

/* Sidebar */
.custom-drawer {
  background: linear-gradient(180deg, #003366, #00509e);
  transition: width 0.5s ease;
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 10px;
}
.user-info {
  padding: 16px;
}
.menu-item {
  transition: background-color 0.3s, transform 0.3s;
}
.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: scale(1.02);
}
.active-list-item {
  background-color: rgba(255, 255, 255, 0.2) !important;
  border-left: 5px solid #ffcc00;
}
.v-list-item-title {
  font-weight: 600;
  font-size: 16px;
}
.v-icon {
  font-size: 24px;
}

/* Aumenta el tamaño de los íconos en modo mini */
.v-navigation-drawer--mini .v-icon {
  font-size: 30px !important;
}

/* Botón para contraer/expandir el menú */
.toggle-btn {
  position: relative;
  background: transparent;
  color: #fff;
  z-index: 1;
  transition: transform 0.3s ease;
}
.toggle-btn:hover {
  transform: scale(1.1);
}

/* Contenedor para el contenido principal */
.main-content-wrapper {
  min-height: 100%;
  transition: margin-left 0.5s ease;
}

/* Responsive styling */
@media (max-width: 600px) {
  .login-card {
    width: 90%;
    padding: 16px;
  }
  .login-logo {
    height: 120px;
  }
  .google-btn {
    font-size: 14px !important;
  }
}
</style>
