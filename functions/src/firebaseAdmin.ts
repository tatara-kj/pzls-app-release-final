import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

if (admin.apps.length === 0) {
  const saPath = path.join(__dirname, "..", "serviceAccount.json");

  if (fs.existsSync(saPath)) {
    // lokalnie (emulator/dev) – z pliku
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: "pzls-app",
    });
  } else {
    // produkcja – bez klucza (default credentials)
    admin.initializeApp({ projectId: "pzls-app" });
  }
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export default admin;
