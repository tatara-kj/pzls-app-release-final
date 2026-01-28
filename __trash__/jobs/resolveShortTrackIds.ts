import admin from "../firebaseAdmin";
import { fetchShortTrackEventsMap, slug } from "../apis/shortTiming";

export async function resolveShortTrackIdsJob() {
  const db = admin.firestore();
  const season = "2024/25"; // <- możesz brać z pola "season"
  const seasonStart = season.split("/")[0]; // "2024"

  console.log("🔍 Pobieram mapę SwisTiming…");
  const map = await fetchShortTrackEventsMap(seasonStart);

  const snap = await db
    .collection("eventDetails")
    .where("track", "==", "short-track")
    .where("shortTrackId", "==", null) // tylko puste
    .get();

  const batch = db.batch();

  snap.docs.forEach((doc) => {
    const d = doc.data() as any;
    const key = `${d.eventDate}|${slug(d.eventName)}`;

    const compId = map[key];
    if (compId) {
      console.log(`✅ ${doc.id} → ${compId}`);
      batch.update(doc.ref, { shortTrackId: compId });
    } else {
      console.log(`⚠️  Nie znaleziono compId dla ${doc.id}`);
    }
  });

  await batch.commit();
  console.log("🏁 resolveShortTrackIds – zakończono");
}
