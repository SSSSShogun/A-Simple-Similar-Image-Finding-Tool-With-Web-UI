import sharp from "sharp"
import { getImageFile } from "./library.js"

const cache = new Map()
const CACHE_MAX = 30000
const CONCURRENCY = 24

function clampWidth(width) {
  return Math.max(8, Math.min(512, Number(width) || 128))
}

// 生成单张缩略图
async function generate(rel, w) {
  const abs = getImageFile(rel)
  if (!abs) return null
  try {
    return await sharp(abs, { limitInputPixels: false })
      .resize(w, w, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    return null
  }
}

function remember(key, buf) {
  if (cache.size >= CACHE_MAX) cache.clear()
  cache.set(key, buf)
}

// 取缩略图
export async function getThumbnail(rel, width) {
  if (typeof rel !== "string" || !rel) return null
  const w = clampWidth(width)
  const key = `${rel}:${w}`
  if (cache.has(key)) return cache.get(key)
  const buf = await generate(rel, w)
  if (buf) remember(key, buf)
  return buf
}

// 限量并发工具
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i
        i += 1
        out[idx] = await fn(items[idx])
      }
    }
  )
  await Promise.all(workers)
  return out
}

// 批量预热：对未命中的缩略图并发生成并写入缓存
export async function prewarmThumbs(paths, width) {
  const w = clampWidth(width)
  const todo = []
  for (const rel of paths) {
    if (typeof rel !== "string" || !rel) continue
    const key = `${rel}:${w}`
    if (!cache.has(key)) todo.push({ rel, key })
  }
  let generated = 0
  await mapLimit(todo, CONCURRENCY, async ({ rel, key }) => {
    const buf = await generate(rel, w)
    if (buf) {
      remember(key, buf)
      generated += 1
    }
  })
  return { generated, total: paths.length }
}
