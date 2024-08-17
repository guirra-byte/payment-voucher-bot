const { parentPort, Worker } = require("node:worker_threads");
const path = require("node:path");

if (parentPort) {
  parentPort.on("message", async (upcomming_msg) => {
    const msg = JSON.parse(upcomming_msg);

    if (msg) {
      const media = await msg.downloadMedia();

      if (media.mimetype === "image/jpeg") {
        let filename = media.filename ?? nanoid();
        const dowloadsPath = path.resolve(__dirname, "../tmp/downloads");
        const [, type] = media.mimetype.split("/");

        const bufferfy = Buffer.from(media.data, "base64");
        const filepath = `${dowloadsPath}/${filename}.${type}`;
        fs.writeFile(filepath, bufferfy, (err) => {
          if (err) throw err;

          const workerPath = path.resolve("./background-task.js");
          const worker = new Worker(workerPath);
          worker.postMessage(
            JSON.stringify({
              chatId: chat.id,
              contact: paymentOwner,
              imgPath: filepath,
            })
          );
        });
      }
    }
  });
}
