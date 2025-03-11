<template>
    <v-container class="login-container">
      <v-card class="login-card" outlined>
        <v-card-title>Iniciar Sesión</v-card-title>
        <v-card-text>
          <!-- Formulario de Email/Contraseña -->
          <v-text-field
            v-model="email"
            label="Correo electrónico"
            type="email"
            outlined
            dense
            required
          ></v-text-field>
          <v-text-field
            v-model="password"
            label="Contraseña"
            type="password"
            outlined
            dense
            required
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="login" :loading="loading">Ingresar</v-btn>
        </v-card-actions>
        <v-alert v-if="error" type="error" dismissible>
          {{ error }}
        </v-alert>
        <v-divider class="my-4"></v-divider>
        <!-- Botón para iniciar sesión con Google -->
        <v-card-actions>
          <v-btn color="red darken-1" @click="loginWithGoogle" :loading="loadingGoogle">
            <v-icon left>mdi-google</v-icon>
            Ingresar con Google
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-container>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
  } from "firebase/auth";
  import { auth } from "@/services/firebase";
  
  const email = ref("");
  const password = ref("");
  const error = ref("");
  const loading = ref(false);
  const loadingGoogle = ref(false);
  const router = useRouter();
  
  // Función para login con correo/contraseña
  const login = async () => {
    error.value = "";
    loading.value = true;
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value);
      router.push("/");
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };
  
  // Función para login con Google
  const loginWithGoogle = async () => {
    error.value = "";
    loadingGoogle.value = true;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      error.value = err.message;
    } finally {
      loadingGoogle.value = false;
    }
  };
  </script>
  
  <style scoped>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }
  .login-card {
    width: 400px;
    padding: 20px;
  }
  </style>
  
  