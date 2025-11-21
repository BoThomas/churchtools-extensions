import './style.css';

// TODO: CT reset nukes prime volt styling, therfore deactivated for now
// only import reset.css in development mode to keep the production bundle small and to simulate CT environment
// if (import.meta.env.MODE === "development") {
//   import("./utils/reset.css");
// }

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import StyleClass from 'primevue/styleclass';
import ConfirmationService from 'primevue/confirmationservice';

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  unstyled: true,
  darkModeSelector: 'none',
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('styleclass', StyleClass);
app.directive('tooltip', Tooltip);

// export churchtools KEY for use in other modules
const KEY = import.meta.env.VITE_KEY;
export { KEY };

// Mount the app
app.mount('#app');
