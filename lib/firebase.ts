// apka/lib/firebase.ts
import firestore from "@react-native-firebase/firestore";

// Firestore ma być tylko źródłem do sync -> SQLite.
// NIE trzymamy nieograniczonego cache w telefonie.
firestore().settings({
  cacheSizeBytes: 10 * 1024 * 1024, // 10MB cache (wystarczy)
});

export const db = firestore();
