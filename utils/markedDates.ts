// app/utils/markedDates.ts
import { format } from "date-fns";

/**
 * Przyjmuje tablicę Twoich wydarzeń z Firestore
 *   [{ name, date: "2025-07-12", type: "short-track", ... }, ...]
 * i oddaje obiekt, który “react-native-calendars” umie zinterpretować.
 */
export const buildMarkedDates = (events: any[]) => {
  const marked: Record<string, any> = {};

  events.forEach((ev) => {
    // Konwertujemy datę na format yyyy-MM-dd (wymóg biblioteki)
    const iso = format(new Date(ev.date), "yyyy-MM-dd");

    // Wybieramy kolor kropki: czerwony (short-track) lub złoty (long-track)
    const dotColor = ev.type === "short-track" ? "#E32428" : "#BF8224";

    // Jeśli jeszcze nie ma wpisu dla tego dnia, tworzymy go
    if (!marked[iso]) marked[iso] = { dots: [] };

    // Doklejamy kolejną kropkę (gdyby było kilka eventów tego samego dnia)
    marked[iso].dots.push({ color: dotColor });
  });

  return marked;
};
