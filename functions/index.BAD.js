const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

// U CIEBIE job jest w functions/lib/jobs/syncAthletes.js
const { syncAthletes } = require("./lib/jobs/syncAthletes");

exports.syncAthletesJob = functions
  .runWith({
    secrets: ["DOMTEL_TOKEN"],
    timeoutSeconds: 300,
    memory: "256MB",
  })
  .pubsub.schedule("every 12 hours")
  .timeZone("Europe/Warsaw")
  .onRun(async () => {
    const token = process.env.DOMTEL_TOKEN;
    if (!token) throw new Error("DOMTEL_TOKEN is missing in runtime env");

    // nie loguj tokena. Możesz logować długość:
    console.log("DOMTEL_TOKEN length:", token.length);

    await syncAthletes(token);
  });
exports.syncAthletesNow = functions
  .runWith({ secrets: ["DOMTEL_TOKEN"], timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    try {
      const token = process.env.DOMTEL_TOKEN;
      if (!token) throw new Error("DOMTEL_TOKEN missing");
      await syncAthletes(token);
      res.status(200).send("OK");
    } catch (e) {
      console.error(e);
      res.status(500).send("ERROR");
    }
  });
