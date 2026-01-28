import admin from "../firebaseAdmin";
import { fetchLongTrackEntries } from "../apis/ssr";
import { fetchShortTrackEntries } from "../apis/isuShort";
import { EventDetails } from "../types";

export async function fetchEntriesJob() {
  console.log(">>> START entries job");

  const snap = await admin
    .firestore()
    .collection("eventDetails")
    .where("entries", "==", []) // tylko puste
    .get();

  const batch = admin.firestore().batch();

  for (const doc of snap.docs) {
    const data = doc.data() as EventDetails;

    if (data.entries?.length) continue; // już ma listę

    let entries: EventDetails["entries"] = [];

    if (data.track === "long-track") {
      entries = await fetchLongTrackEntries(
        data.eventName,
        data.eventDate /*YYYY-MM-DD*/
      );
    } else {
      entries = await fetchShortTrackEntries(data.shortTrackId);
    }

    console.log(
      `DEBUG ${doc.id} track=${data.track} → entries=${entries.length}`
    );

    if (!entries.length) continue;

    batch.update(doc.ref, {
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(">>> FINISH entries job");
}
