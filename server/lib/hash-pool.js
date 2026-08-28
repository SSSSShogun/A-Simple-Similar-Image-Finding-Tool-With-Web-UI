import os from "node:os"
import { Worker } from "node:worker_threads"

// 并行计算一批图片的 pHash。
export function computeHashes(
  ports,
  { sampleSize, dctBlock, onProgress, shouldAbort } = {}
) {
  return new Promise((resolve) => {
    const total = ports.length
    if (total === 0) return resolve([])
    const numWorkers = Math.max(
      1,
      Math.min(8, os.availableParallelism() ?? 4, total)
    )
    const slots = Array.from({ length: numWorkers }, () => {
      const worker = new Worker(new URL("./hash-worker.js", import.meta.url), {
        workerData: { sampleSize, dctBlock }
      })
      return { worker, idle: true }
    })

    const items = []
    let done = 0
    let next = 0
    let aborted = false

    const maybeFinish = () => {
      if (aborted || done >= total) {
        slots.forEach((s) => s.worker.terminate())
        resolve(items)
      }
    }
    const pump = (slot) => {
      if (aborted) return
      if (slot.idle && next < total) {
        const idx = next
        next += 1
        slot.idle = false
        slot.worker.postMessage({ type: "compute", id: idx, abs: ports[idx].abs })
      }
    }
    slots.forEach((slot) => {
      slot.worker.on("message", (msg) => {
        if (msg?.type === "done" && !msg.error) {
          items.push({ meta: ports[msg.id].meta, hash: msg.hash })
        }
        done += 1
        if (onProgress) onProgress(done, total)
        slot.idle = true
        pump(slot)
        maybeFinish()
      })
      pump(slot)
    })

    if (shouldAbort) {
      const iv = setInterval(() => {
        if (shouldAbort()) {
          aborted = true
          clearInterval(iv)
          maybeFinish()
        } else if (done >= total) {
          clearInterval(iv)
        }
      }, 50)
    }
  })
}
