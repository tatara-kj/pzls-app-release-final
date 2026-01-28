import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { syncAthletes } from "./jobs/syncAthletes";
import { syncDomtelEvents } from "./jobs/syncDomtelEvents";

initializeApp();

// Sekrety
const DOMTEL_TOKEN = defineSecret("DOMTEL_TOKEN");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const APP_API_KEY = defineSecret("APP_API_KEY");

// CRON: zawodnicy (offline source -> Firestore athletes)
export const syncAthletesJob = onSchedule(
  {
    region: "europe-west3",
    schedule: "15 3 * * *",
    timeZone: "Europe/Warsaw",
    secrets: [DOMTEL_TOKEN],
  },
  async () => {
    const token = DOMTEL_TOKEN.value();
    if (!token) throw new Error("DOMTEL_TOKEN missing");
    await syncAthletes(token);
  }
);

// CRON: imprezy spis (offline source -> Firestore domtel_events)
export const syncDomtelEventsJob = onSchedule(
  {
    region: "europe-west3",
    schedule: "25 3 * * *",
    timeZone: "Europe/Warsaw",
    secrets: [DOMTEL_TOKEN],
  },
  async () => {
    const token = DOMTEL_TOKEN.value();
    if (!token) throw new Error("DOMTEL_TOKEN missing");
    await syncDomtelEvents(token);
  }
);

// a–f (już było)
export { athleteAchievements } from "./apis/athleteAchievements";
export { athleteResults } from "./apis/athleteResults";
export { athleteSeasonBests } from "./apis/athleteSeasonBests";

// g/h/i (+konkurencje)
export { eventResults } from "./apis/eventResults";
export { ranking } from "./apis/ranking";
export { competitions } from "./apis/competitions";
export { domtelEvents } from "./apis/domtelEvents";
