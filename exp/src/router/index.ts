import { createRouter, createWebHistory } from "vue-router";
import DayReport from "../views/DayReport.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "dayreport",
      component: DayReport,
    },
  ],
});

export default router;
