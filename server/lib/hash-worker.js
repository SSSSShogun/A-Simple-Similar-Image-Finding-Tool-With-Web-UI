import { parentPort, workerData } from "node:worker_threads"
import { computePHashFile } from "./phash.js"

const { sampleSize, dctBlock } = workerData

parentPort.on("message", async (msg) => {
  if (msg?.type !== "compute") return
  try {
    const hash = await computePHashFile(msg.abs, sampleSize, dctBlock)
    parentPort.postMessage({ type: "done", id: msg.id, hash })
  } catch {
    parentPort.postMessage({ type: "done", id: msg.id, error: true })
  }
})
