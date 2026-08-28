import { computeHashes } from "./hash-pool.js"
import { getImageFile } from "./library.js"

function imageUrl(relPath) {
  return `/api/files/image?path=${encodeURIComponent(relPath)}`
}

// 把一个图片相对路径元数据补齐为前端展示需要的 item 结构
function toItem(meta) {
  return {
    id: meta.path,
    path: meta.path,
    name: meta.name,
    url: imageUrl(meta.path)
  }
}

// 汉明距离
export function hammingDistance(a, b) {
  if (a.length !== b.length) {
    throw new Error("两个哈希长度不一致，无法比较")
  }
  let dist = 0
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) dist += 1
  }
  return dist
}

// 并查集
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array(n).fill(0)
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x])
    return this.parent[x]
  }
  union(x, y) {
    const rx = this.find(x)
    const ry = this.find(y)
    if (rx === ry) return
    if (this.rank[rx] < this.rank[ry]) this.parent[rx] = ry
    else if (this.rank[rx] > this.rank[ry]) this.parent[ry] = rx
    else {
      this.parent[ry] = rx
      this.rank[rx] += 1
    }
  }
}

// pHash 分组：全部图片算位串 - 两两汉明距离 ≤ 阈值 - 并查集
async function computePHashGroups(
  metas,
  params,
  { onProgress, shouldAbort } = {}
) {
  const sampleSize = Number(params.sampleSize) || 32
  const dctBlock = Number(params.dctBlock) || 8
  const thresholdPct = Number(params.threshold) || 5
  const bits = dctBlock * dctBlock
  const thresholdBits = Math.max(1, Math.round((thresholdPct / 100) * bits))

  // 收集所有可读取的图片
  const ports = []
  for (const meta of metas) {
    const abs = getImageFile(meta.path)
    if (abs) ports.push({ abs, meta })
  }
  const items = await computeHashes(ports, {
    sampleSize,
    dctBlock,
    onProgress,
    shouldAbort
  })

  if (items.length < 2) return { groups: [] }

  // 并查集
  const n = items.length
  const uf = new UnionFind(n)
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (hammingDistance(items[i].hash, items[j].hash) <= thresholdBits) {
        uf.union(i, j)
      }
    }
  }

  // 按根聚拢
  const buckets = new Map()
  for (let i = 0; i < n; i += 1) {
    const root = uf.find(i)
    if (!buckets.has(root)) buckets.set(root, [])
    buckets.get(root).push(items[i].meta)
  }

  const groups = []
  let groupNo = 0
  for (const [, groupMetas] of buckets) {
    if (groupMetas.length < 2) continue // 单张图片不计为相似组
    groupNo += 1
    groups.push({
      id: `group-${groupNo}`,
      items: groupMetas.map(toItem)
    })
  }
  return { groups }
}

/**
 * 按方法分派相似性计算。
 * @param {string} method 'phash' | 其他
 * @param {Array<{path:string,name:string}>} metas 图片相对路径元数据
 * @param {object} params 算法参数
 * @param {object} hooks.onProgress (done,total) 进度回调
 * @param {function} hooks.shouldAbort 中断检查（返回 true 停止）
 */
export async function computeSimilarity(method, metas, params, hooks = {}) {
  if (method === "phash") {
    return computePHashGroups(metas, params || {}, hooks)
  }
  // 其余方法暂未实现
  return { groups: [] }
}
