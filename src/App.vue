<template>
  <v-app>
    <!-- Si el usuario no está autenticado se muestra el formulario de autenticación -->
    <div v-if="!user" class="login-wrapper">
      <v-container class="login-container">
        <v-card class="login-card" outlined>
          <v-card-title class="headline justify-center">
            Bienvenido a MiApp
          </v-card-title>
          <v-card-subtitle class="text-center mb-4">
            Inicia sesión para continuar
          </v-card-subtitle>
          <v-card-text class="text-center">
            <v-btn color="red darken-1" @click="loginWithGoogle" :loading="loadingGoogle" large>
              <v-icon left>mdi-google</v-icon>
              Ingresar con Google
            </v-btn>
            <v-alert v-if="error" type="error" dismissible class="mt-4">
              {{ error }}
            </v-alert>
          </v-card-text>
          <v-card-actions class="justify-center">
            <span class="caption">Al continuar, aceptas nuestros términos y condiciones.</span>
          </v-card-actions>
        </v-card>
      </v-container>
    </div>

    <!-- Si el usuario está autenticado se muestra el layout principal -->
    <div v-else>
      <!-- Sidebar (Menú lateral) -->
      <v-navigation-drawer app class="custom-drawer" dark width="250" clipped>
        <v-list dense>
          <!-- Sección de datos del usuario -->
          <v-list-item class="user-info">
            <v-list-item-avatar>
              <v-img :src="user.photoURL || 'https://via.placeholder.com/50'" />
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>{{ user.displayName || user.email }}</v-list-item-title>
              <v-list-item-subtitle>{{ userRole }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-divider></v-divider>
          <!-- Menú principal -->
          <v-list-item-group v-model="selectedRoute" active-class="active-list-item">
            <v-list-item
              v-for="item in menuItems"
              :key="item.route"
              @click="goTo(item.route)"
              :value="item.route"
              class="menu-item"
            >
              <v-list-item-icon>
                <v-icon>{{ item.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <!-- Opción para Cerrar Sesión -->
            <v-list-item @click="logout" class="menu-item">
              <v-list-item-icon>
                <v-icon>mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Cerrar Sesión</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-navigation-drawer>

      <!-- Contenido principal -->
      <v-main>
        <router-view />
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

export default {
  name: "App",
  data() {
    return {
      error: "",
      loadingGoogle: false,
      userRole: "Estudiante",
      menuItems: [
        { title: "Inicio", icon: "mdi-view-dashboard", route: "/" },
        { title: "Calendario", icon: "mdi-calendar-clock", route: "/calendario" },
        { title: "Subida de Archivos", icon: "mdi-folder-upload", route: "/subida" },
        { title: "Notas", icon: "mdi-note-multiple", route: "/notas" },
        { title: "Informes", icon: "mdi-chart-line", route: "/informes" },
      ],
      selectedRoute: this.$route.path,
    };
  },
  computed: {
    // Accedemos al usuario del store global
    user() {
      return this.$store.state.user;
    },
  },
  watch: {
    "$route.path"(newPath) {
      this.selectedRoute = newPath;
    },
  },
  created() {
    // Escucha los cambios en el estado de autenticación y actualiza el store
    onAuthStateChanged(auth, (user) => {
      this.$store.commit("setUser", user);
    });
  },
  methods: {
    async loginWithGoogle() {
      this.error = "";
      this.loadingGoogle = true;
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // El estado se actualizará automáticamente con onAuthStateChanged y el store
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
  },
};
</script>

<style scoped>
/* Fondo global para el login */
.login-wrapper {
  background: linear-gradient(135deg, #cceeff, #ffffff);
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
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
}

/* Sidebar */
.custom-drawer {
  background: linear-gradient(180deg, #003366, #00509e);
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
</style>
