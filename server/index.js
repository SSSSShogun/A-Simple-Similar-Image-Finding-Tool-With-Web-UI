import "dotenv/config"
import express from "express"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import {
  addRoot,
  deleteImage,
  ensureRoot,
  getImageFile,
  listCurrentRoots,
  listImages,
  openNativeSelection,
  removeRoot
} from "./lib/library.js"
import { computeSimilarity } from "./lib/similarity.js"
import { getThumbnail, prewarmThumbs } from "./lib/thumb.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")

const app = express()
app.use(express.json({ limit: "20mb" }))

// 确保图片根目录存在
ensureRoot()

// ---- 图库 API ----
// 列出图片
app.get("/api/files", (_req, res) => {
  res.json(listImages())
})

// 返回单张图片
app.get("/api/files/image", (req, res) => {
  const rel = typeof req.query.path === "string" ? req.query.path : ""
  const abs = getImageFile(rel)
  if (!abs) {
    res.status(404).json({ error: "index-1" })
    return
  }
  res.sendFile(abs)
})

// 返回缩略图
app.get("/api/files/thumb", async (req, res) => {
  const rel = typeof req.query.path === "string" ? req.query.path : ""
  const w = Number(req.query.w) || 128
  const buf = await getThumbnail(rel, w)
  if (!buf) {
    res.status(404).json({ error: "index-1" })
    return
  }
  res.setHeader("Content-Type", "image/jpeg")
  res.setHeader("Cache-Control", "public, max-age=3600")
  res.send(buf)
})

// 批量预热缩略图
app.post("/api/thumbs/prewarm", async (req, res) => {
  const { paths, w } = req.body || {}
  if (!Array.isArray(paths)) {
    res.status(400).json({ error: "index-2" })
    return
  }
  const result = await prewarmThumbs(paths, Number(w) || 96)
  res.json(result)
})

// 批量读取图片分辨率
app.post("/api/files/dimensions", async (req, res) => {
  const { paths } = req.body || {}
  if (!Array.isArray(paths)) {
    res.status(400).json({ error: "index-2" })
    return
  }
  const dims = {}
  const CONCURRENCY = 16
  const total = paths.length
  let next = 0

  const worker = async () => {
    while (next < total) {
      const rel = paths[next]
      next += 1
      if (typeof rel !== "string" || !rel) continue
      const abs = getImageFile(rel)
      if (!abs) continue
      try {
        const meta = await sharp(abs, { limitInputPixels: false }).metadata()
        if (meta.width && meta.height) {
          dims[rel] = {
            width: meta.width,
            height: meta.height,
            product: meta.width * meta.height
          }
        }
      } catch {
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(CONCURRENCY, total)) }, worker)
  )

  res.json({ dims })
})

// 删除图片
app.delete("/api/files", async (req, res) => {
  const { path: rel } = req.body || {}
  if (typeof rel !== "string" || !rel) {
    res.status(400).json({ error: "index-3" })
    return
  }
  const ok = await deleteImage(rel)
  if (!ok) {
    res.status(404).json({ error: "index-4" })
    return
  }
  res.json({ ok: true })
})

// ---- 目录与运行时根目录管理 ----
// 当前全部根目录
app.get("/api/roots", (_req, res) => {
  res.json(listCurrentRoots())
})

// 运行时添加目录：校验 + 去重
app.post("/api/dirs/add", async (req, res) => {
  const selectedPath = await openNativeSelection(req.body.prompt)
  // 取消或未选择则静默处理
  if (typeof selectedPath !== "string" || !selectedPath.trim()) {
    return res.json({ ok: false, cancelled: true })
  }
  const result = addRoot(selectedPath)
  if (!result.ok) {
    return res.status(400).json({ error: result.reason })
  }
  return res.json({ ok: true, roots: result.roots })
})

// 移除运行时添加的目录
app.post("/api/dirs/remove", (req, res) => {
  const { path: p } = req.body || {}
  const result = removeRoot(p)
  if (!result.ok) {
    res.status(400).json({ error: result.reason })
    return
  }
  res.json({ ok: true, roots: result.roots })
})

// ---- 下载：把选中的图片打包为 download.zip ----
app.get("/api/files/download", async (req, res) => {
  const raw = req.query.paths
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const JSZip = (await import("jszip")).default
  const zip = new JSZip()
  for (const rel of list) {
    const abs = getImageFile(typeof rel === "string" ? rel : "")
    if (!abs) continue
    zip.file(path.basename(rel), fs.readFileSync(abs))
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" })
  res.setHeader("Content-Type", "application/zip")
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=\"download.zip\""
  )
  res.send(buf)
})

// ---- 相似性计算 ----
app.post("/api/similarity", async (req, res) => {
  const { method, paths, params } = req.body || {}
  if (typeof method !== "string" || !Array.isArray(paths)) {
    res.status(400).json({ error: "index-5" })
    return
  }
  const library = listImages()
  const byPath = new Map(library.map((m) => [m.path, m]))
  const metas = paths
    .map((p) => (typeof p === "string" ? byPath.get(p) : undefined))
    .filter(Boolean)

  const task = { aborted: false }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  })
  res.flushHeaders()

  res.on("close", () => {
    task.aborted = true
  })

  try {
    const { groups } = await computeSimilarity(method, metas, params || {}, {
      onProgress: (done, total) => {
        res.write(`data:${JSON.stringify({ kind: "progress", done, total })}\n\n`)
      },
      shouldAbort: () => task.aborted
    })
    if (!res.writableEnded) {
      res.write(`data:${JSON.stringify({ kind: "done", groups })}\n\n`)
    }
  } catch (e) {
    res.write(`data:${JSON.stringify({ kind: "error", error: String(e?.message || e) })}\n\n`)
  } finally {
    if (!res.writableEnded) res.end()
  }
})

// ---- 静态托管前端 ----
const distDir = path.join(PROJECT_ROOT, "dist")
app.use(express.static(distDir))

// SPA 兜底
app.use((_req, res) => {
  res.sendFile(path.join(distDir, "index.html"))
})

const port = 3000
app.listen(port, () => {
  console.log(
    `[ASSIFT][A-Simple-Similar-Image-Finding-Tool] is running on http://localhost:${port}`
  )
})
