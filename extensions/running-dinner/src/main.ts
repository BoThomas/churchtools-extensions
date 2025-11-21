import './style.css';

// TODO: CT reset nukes prime volt styling, therfore deactivated for now
// only import reset.css in development mode to keep the production bundle small and to simulate CT environment
// if (import.meta.env.MODE === "development") {
//   import("./utils/reset.css");
// }

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
//import router from './router';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import StyleClass from 'primevue/styleclass';
import ConfirmationService from 'primevue/confirmationservice';

const app = createApp(App);

app.use(createPinia());
//app.use(router);
app.use(PrimeVue, {
  unstyled: true,
  darkModeSelector: 'none',
  // pt: {
  //   directives: {
  //     tooltip: {
  //       root: {
  //         class: `hidden w-fit pointer-events-none absolute max-w-48 group drop-shadow-lg animate-fade-in
  //                 data-[p-position=top]:py-1 data-[p-position=bottom]:py-1
  //                 data-[p-position=left]:px-1 data-[p-position=right]:px-1
  //                 `,
  //       },
  //       arrow: {
  //         class: `absolute w-0 h-0 border-transparent border-solid border-[.25rem]
  //                 group-data-[p-position=top]:border-y-surface-700 group-data-[p-position=top]:-ml-1 group-data-[p-position=top]:border-b-0
  //                 group-data-[p-position=bottom]:border-y-surface-700 group-data-[p-position=bottom]:-ml-1 group-data-[p-position=bottom]:border-t-0
  //                 group-data-[p-position=left]:border-l-surface-700 group-data-[p-position=left]:-mt-1 group-data-[p-position=left]:border-r-0
  //                 group-data-[p-position=right]:border-r-surface-700 group-data-[p-position=right]:-mt-1 group-data-[p-position=right]:border-l-0
  //                 `,
  //       },
  //       text: {
  //         class: "break-words whitespace-pre-line bg-surface-700 text-surface-0 px-3 py-2 rounded",
  //       },
  //     },
  //   },
  // },
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('styleclass', StyleClass);
app.directive('tooltip', Tooltip);

// export churchtools KEY for use in other modules
const KEY = import.meta.env.VITE_KEY;
export { KEY };

// Mount the app
//router.isReady().then(() => {
app.mount('#app');
//});
