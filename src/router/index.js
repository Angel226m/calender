import Vue from 'vue';
import VueRouter from 'vue-router';

// Importamos las vistas principales
import HomeView from '@/views/HomeView.vue';
import CalendarioView from '@/views/CalendarioView.vue';
import SubidaView from '@/views/SubidaView.vue';
import NotasView from '@/views/NotasView.vue';
import RegistroView from '@/views/GestionAcademica/RegistroView.vue';
import AsistenciaView from '@/views/GestionAcademica/AsistenciaView.vue';
import ReportesView from '@/views/GestionAcademica/ReportesView.vue';
import LoginView from '@/views/LoginView.vue';

// Importamos la vista para informes que se usará en el botón de "Informes"
import InformesView from '@/views/InformesView.vue';

// Rutas para generación de informes (opcional, si las usas en otro menú)
import AcademicosView from '@/views/GeneracionInformes/AcademicosView.vue';
import EventosView from '@/views/GeneracionInformes/EventosView.vue';
import ListasView from '@/views/GeneracionInformes/ListasView.vue';

Vue.use(VueRouter);

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/calendario', name: 'calendario', component: CalendarioView },
  { path: '/subida', name: 'subida', component: SubidaView },
  { path: '/notas', name: 'notas', component: NotasView },
  { path: '/gestion/registro', name: 'registro', component: RegistroView },
  { path: '/gestion/asistencia', name: 'asistencia', component: AsistenciaView },
  { path: '/gestion/reportes', name: 'reportes', component: ReportesView },
  { path: '/login', name: 'login', component: LoginView },
  // Ruta para el botón "Informes" en el menú, usando InformesView.vue
  { path: '/informes', name: 'informes', component: InformesView },
  // Rutas para generación de informes (si las usas)
  { path: '/generacion-informes/academicos', name: 'academicos', component: AcademicosView },
  { path: '/generacion-informes/eventos', name: 'eventos', component: EventosView },
  { path: '/generacion-informes/listas', name: 'listas', component: ListasView },
  // Redirige cualquier ruta no encontrada a la página de inicio
  { path: '*', redirect: '/' },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;

/*import Vue from 'vue';
import VueRouter from 'vue-router';

// Importamos las vistas principales
import HomeView from '@/views/HomeView.vue';
import CalendarioView from '@/views/CalendarioView.vue';
import SubidaView from '@/views/SubidaView.vue';
import NotasView from '@/views/NotasView.vue';
import RegistroView from '@/views/GestionAcademica/RegistroView.vue';
import AsistenciaView from '@/views/GestionAcademica/AsistenciaView.vue';
import ReportesView from '@/views/GestionAcademica/ReportesView.vue';
import LoginView from '@/views/LoginView.vue';

 
Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/calendario',
    name: 'calendario',
    component: CalendarioView,
  },
  {
    path: '/subida',
    name: 'subida',
    component: SubidaView,
  },
  {
    path: '/notas',
    name: 'notas',
    component: NotasView,
  },
  {
    path: '/gestion/registro',
    name: 'registro',
    component: RegistroView,
  },
  {
    path: '/gestion/asistencia',
    name: 'asistencia',
    component: AsistenciaView,
  },
  {
    path: '/gestion/reportes',
    name: 'reportes',
    component: ReportesView,
  },
  // Manejamos rutas no encontradas
  { path: '/login', name: 'Login', component: LoginView },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;*/

/*

import Vue from 'vue';
import VueRouter from 'vue-router';

// Importamos las vistas principales
import HomeView from '@/views/HomeView.vue';
import CalendarioView from '@/views/CalendarioView.vue';
import SubidaView from '@/views/SubidaView.vue';
import NotasView from '@/views/NotasView.vue';
import RegistroView from '@/views/GestionAcademica/RegistroView.vue';
import AsistenciaView from '@/views/GestionAcademica/AsistenciaView.vue';
import ReportesView from '@/views/GestionAcademica/ReportesView.vue';
import LoginView from '@/views/LoginView.vue';

// Importa Firebase Auth (para la versión modular)
import { getAuth } from "firebase/auth";

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/calendario',
    name: 'calendario',
    component: CalendarioView,
    meta: { requiresAuth: true }
  },
  {
    path: '/subida',
    name: 'subida',
    component: SubidaView,
    meta: { requiresAuth: true }
  },
  {
    path: '/notas',
    name: 'notas',
    component: NotasView,
    meta: { requiresAuth: true }
  },
  {
    path: '/gestion/registro',
    name: 'registro',
    component: RegistroView,
    meta: { requiresAuth: true }
  },
  {
    path: '/gestion/asistencia',
    name: 'asistencia',
    component: AsistenciaView,
    meta: { requiresAuth: true }
  },
  {
    path: '/gestion/reportes',
    name: 'reportes',
    component: ReportesView,
    meta: { requiresAuth: true }
  },
  // Ruta de Login no requiere autenticación
  { 
    path: '/login', 
    name: 'Login', 
    component: LoginView 
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

// Navigation guard global para proteger rutas que requieren autenticación
router.beforeEach((to, from, next) => {
  const auth = getAuth();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !auth.currentUser) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

export default router;


*/