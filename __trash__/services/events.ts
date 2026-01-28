// src/services/events.ts
import { FALLBACK_DETAILS } from "../data/mockData";

export type EventDetails = typeof FALLBACK_DETAILS; // prosty typ

export const getEventDetails = async (
  eventId: string
): Promise<EventDetails> => {
  // 🚧 1. Dziś zawsze zwracamy mock.
  // 🛠 2. Jutro zamienimy to na fetch z API / Firestore.
  await new Promise((r) => setTimeout(r, 150)); // symulacja małego opóźnienia
  return FALLBACK_DETAILS;
};
