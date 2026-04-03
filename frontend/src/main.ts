import { createApp } from "vue";
import "@/style.css";
import App from "@/App.vue";
import router from "@/router";
import { i18n } from "@/i18n";
import { createPinia } from "pinia";

const app = createApp(App);

// Surface unhandled Vue errors in the browser console and in dev as a visible
// overlay so silent white screens become diagnosable.
app.config.errorHandler = (err, instance, info) => {
  console.error("[Vue error]", info, err, instance);
};

app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount("#app");
