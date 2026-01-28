import admin, { FieldValue } from "../firebaseAdmin";
import { EventDetails } from "../types";

export async function initEventDetails() {
  const db = admin.firestore();
  console.log("🚀 Łączenie z Firestore…");

  const eventsSnap = await db.collection("events").get();
  console.log(`📚 Znaleziono ${eventsSnap.size} eventów`);

  if (eventsSnap.empty) return;

  const batch = db.batch();

  eventsSnap.docs.forEach((doc) => {
    const ev = doc.data() as any; // surowy event z scrapera

    batch.set(
      db.collection("eventDetails").doc(doc.id),
      <EventDetails>{
        eventRef: doc.ref,
        season: ev.season ?? "2024/25",
        track: ev.type, // long-track / short-track
        shortTrackId: ev.externalId ?? null, // ★ NOWE POLE (np. 1122030001)
        entries: [],
        results: [],
        youtube: null,
        eventName: ev.name,
        eventDate: ev.date,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  console.log(`✅ utworzono/uzupełniono ${eventsSnap.size} eventDetails`);
}

// ◄◄◄ skrypt jednorazowy
initEventDetails().then(() => process.exit(0));
