/*import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify'; // si tienes un archivo de configuración de vuetify
import router from './router';
import firebaseApp from './services/firebase'; // 🔥 Importa Firebase

Vue.config.productionTip = false;

// Usamos la sintaxis de Vue 2
new Vue({
  vuetify,
  router,
  render: h => h(App),
}).$mount('#app');
*/


/*  ultimo
import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import router from "./router";
import { db } from "./services/firebase"; // ✅ Solo importa lo que realmente usas

Vue.config.productionTip = false;

new Vue({
  vuetify,
  router,
  render: (h) => h(App),
}).$mount("#app");

export { db };
*/


import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import router from "./router";
import store from "./store"; // Importa el store de Vuex
import { db } from "./services/firebase"; // ✅ Solo importa lo que realmente usas

Vue.config.productionTip = false;

new Vue({
  vuetify,
  router,
  store, // Agrega el store aquí para tener estado global
  render: (h) => h(App),
}).$mount("#app");

export { db };
