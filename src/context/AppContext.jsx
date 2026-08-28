import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { getFactor } from "../constants/autoSelectFactors"
import { METHOD_CONFIGS } from "../constants/methodConfigs"
import { DEFAULT_METHOD, SIMILARITY_METHODS } from "../constants/similarityMethods"

const AppStateContext = createContext(null)

// 取某参数的默认值集合
function buildParamDefaults(config) {
  const out = {}
  ;(config.params || []).forEach((p) => {
    out[p.key] = p.default
  })
  return out
}

// 由所有方法的 schema 生成初始配置
function buildInitialConfigs() {
  const out = {}
  Object.values(METHOD_CONFIGS).forEach((cfg) => {
    out[cfg.id] = buildParamDefaults(cfg)
  })
  return out
}

// 把后端图库元数据映射为前端图片模型；id 与结果显示保持一致（用相对路径）
function toImageModel(meta) {
  return {
    id: meta.path,
    path: meta.path,
    name: meta.name,
    size: meta.size,
    mtime: meta.mtime,
    url: `/api/files/image?path=${encodeURIComponent(meta.path)}`
  }
}

export function AppProvider({ children }) {
  const { t } = useTranslation()
  // 上方输入区：后端图库（IMG_ROOT 下的图片）
  const [images, setImages] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  // 运行时根目录，.env读取 + 运行时添加
  const [roots, setRoots] = useState([])

  // 文件夹选择器遮罩相关
  const [dirSelecting, setDirSelecting] = useState(false)
  const [dirSelectError, setDirSelectError] = useState(null)

  // 关闭选择器遮罩
  const closeDirSelect = () => {
    setDirSelectError(null)
    setDirSelecting(false)
  }

  // 拉取当前运行时根目录
  const refreshRoots = async () => {
    try {
      const res = await fetch("/api/roots")
      if (res.ok) {
        const list = await res.json()
        setRoots(Array.isArray(list) ? list : [])
      }
    } catch {
      /* 忽略网络错误 */
    }
  }

  // 运行时添加目录：打开原生选择器；成功/取消自动关闭遮罩，错误则展示信息
  const addRoot = async () => {
    setDirSelecting(true)
    setDirSelectError(null)
    try {
      const res = await fetch("/api/dirs/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: t("native-1") })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDirSelectError(t(data?.error) || t("ctx-1"))
        return { ok: false, reason: t(data?.error) || t("ctx-1") }
      }
      const data = await res.json()
      /* 用户取消 - 静默关闭 */
      if (data?.cancelled) {
        setDirSelecting(false)
        return { ok: false, cancelled: true }
      }
      const nextRoots = Array.isArray(data?.roots) ? data.roots : roots
      setRoots(nextRoots)
      setDirSelecting(false)
      await loadFiles()
      return { ok: true, roots: nextRoots }
    } catch {
      setDirSelectError(t("ctx-2"))
      return { ok: false, reason: t("ctx-2") }
    }
  }

  // 移除运行时添加的目录
  const removeRoot = async (path) => {
    try {
      const res = await fetch("/api/dirs/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      })
      if (!res.ok) return { ok: false }
      const data = await res.json()
      setRoots(Array.isArray(data?.roots) ? data.roots : [])
      await loadFiles()
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  // 挂载时拉取根目录
  useEffect(() => {
    refreshRoots()
  }, [])

  // 相似图片组
  const [groups, setGroups] = useState([])

  // 相似图片组选中状态
  const [selectedMap, setSelectedMap] = useState({})

  // 当前的相似性计算方法
  const [method, setMethod] = useState(DEFAULT_METHOD)

  // 图片查看叠加层
  const [overlay, setOverlay] = useState({ open: false, list: [], index: 0 })

  const openOverlay = (list, index) => {
    if (!list || list.length === 0) return
    setOverlay({ open: true, list, index: index ?? 0 })
  }

  const closeOverlay = () => {
    setOverlay((prev) => ({ ...prev, open: false }))
  }

  // 计算进行中状态
  const [computing, setComputing] = useState(false)

  // 计算进度，取消时清空
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const abortRef = useRef(null)

  // 算法参数配置
  const [methodConfig, setMethodConfig] = useState(buildInitialConfigs)

  // 自动选择相关状态
  const [autoSelectRunning, setAutoSelectRunning] = useState(false)
  const [autoSelectProgress, setAutoSelectProgress] = useState({ done: 0, total: 0 })
  const [autoSelectDims, setAutoSelectDims] = useState({})
  const autoSelectAbortRef = useRef(null)

  const getMethodConfig = (methodId) => methodConfig[methodId] || {}

  const setParamConfig = (methodId, key, value) => {
    setMethodConfig((prev) => ({
      ...prev,
      [methodId]: { ...(prev[methodId] || {}), [key]: value }
    }))
  }

  const resetParamConfig = (methodId) => {
    setMethodConfig((prev) => ({
      ...prev,
      [methodId]: buildParamDefaults(METHOD_CONFIGS[methodId] || {})
    }))
  }

  // 从后端图库加载图片列表
  const loadFiles = async () => {
    setLibraryLoading(true)
    try {
      const res = await fetch("/api/files")
      const list = await res.json()
      const arr = Array.isArray(list) ? list : []
      setImages(arr.map(toImageModel))
      const paths = arr.map((m) => m.path)
      fetch("/api/thumbs/prewarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, w: 96 })
      }).catch(() => {})
    } finally {
      setLibraryLoading(false)
    }
  }

  // 结果区操作相关
  const setGroupsAndClearSelection = (nextGroups) => {
    setGroups(nextGroups)
    setSelectedMap({})
  }

  const toggleImageInGroup = (groupIndex, imagePath) => {
    const group = groups[groupIndex]
    if (!group) return

    const groupSel = selectedMap[groupIndex] || {}
    const selectedCount = group.items.filter((it) => groupSel[it.id]).length

    // 同组不能全选
    if (!groupSel[imagePath] && group.items.length > 1) {
      const willSelectAll = selectedCount + 1 === group.items.length && !groupSel[imagePath]
      if (willSelectAll) return
    }

    setSelectedMap((prev) => {
      const cur = prev[groupIndex] || {}
      const next = { ...cur }
      if (next[imagePath]) {
        delete next[imagePath]
      } else {
        next[imagePath] = true
      }
      const nextGroup = { ...prev, [groupIndex]: next }
      if (Object.keys(next).length === 0) delete nextGroup[groupIndex]
      return nextGroup
    })
  }

  const hasSelection = () =>
    Object.values(selectedMap).some((sel) => sel && Object.keys(sel).length > 0)

  const clearSelection = () => setSelectedMap({})

  // 删除所选相似图片
  const deleteSelected = async () => {
    const paths = []
    Object.values(selectedMap).forEach((sel) => {
      if (!sel) return
      Object.keys(sel).forEach((p) => paths.push(p))
    })
    if (paths.length === 0) return

    const removed = new Set(paths)
    await Promise.all(
      paths.map((p) =>
        fetch("/api/files", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: p })
        }).catch(() => null)
      )
    )

    setImages((prev) => prev.filter((img) => !removed.has(img.id)))
    const nextGroups = groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => !removed.has(it.id))
      }))
      .filter((g) => g.items.length >= 2)
    setGroups(nextGroups)
    setSelectedMap({})
  }

  // 收集结果区选中的图片路径
  const collectSelectedPaths = () => {
    const paths = []
    Object.values(selectedMap).forEach((sel) => {
      if (!sel) return
      Object.keys(sel).forEach((p) => paths.push(p))
    })
    return paths
  }

  // 下载所选
  const downloadSelected = () => {
    const paths = collectSelectedPaths()
    if (paths.length === 0) return
    const qs = paths.map((p) => `paths=${encodeURIComponent(p)}`).join("&")
    const link = document.createElement("a")
    link.href = `/api/files/download?${qs}`
    link.download = "download.zip"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  // 多键比较器
  const compareByFactors = (factors) => {
    const defs = factors.map((f) => ({
      ...getFactor(f.key),
      asc: !!f.asc
    }))
    return (a, b) => {
      for (const d of defs) {
        const va = d.getValue(a)
        const vb = d.getValue(b)
        if (va === vb) continue
        return (va < vb ? -1 : 1) * (d.asc ? 1 : -1)
      }
      return a.name.localeCompare(b.name)
    }
  }

  // 自动选择
  const runAutoSelect = async (factors) => {
    if (autoSelectRunning || groups.length === 0 || factors.length === 0) {
      return
    }

    const controller = new AbortController()
    autoSelectAbortRef.current = controller
    setAutoSelectProgress({ done: 0, total: groups.length })
    setAutoSelectRunning(true)

    try {
      const paths = []
      for (const g of groups) for (const it of g.items) paths.push(it.path)
      let dims = {}
      try {
        const res = await fetch("/api/files/dimensions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ paths })
        })
        if (res.ok) dims = (await res.json())?.dims || {}
      } catch {
        /* 读取失败按最小值处理 */
      }
      setAutoSelectDims(dims)

      const enriched = new Map()
      for (const img of images) {
        const d = dims[img.path] || {}
        enriched.set(img.path, {
          name: img.name,
          size: img.size,
          mtime: img.mtime,
          product: d.product ?? 0
        })
      }

      const comparator = compareByFactors(factors)
      const nextSelected = {}
      let done = 0
      for (let gi = 0; gi < groups.length; gi += 1) {
        if (controller.signal.aborted) break
        const group = groups[gi]
        if (group.items.length >= 2) {
          const sorted = [...group.items].sort((x, y) =>
            comparator(
              enriched.get(x.path) || {},
              enriched.get(y.path) || {}
            )
          )
          const keep = sorted[0].path // 最重要的一张
          const sel = {}
          for (const it of group.items) {
            if (it.path !== keep) sel[it.path] = true
          }
          if (Object.keys(sel).length > 0) nextSelected[gi] = sel
        }
        done += 1
        setAutoSelectProgress({ done, total: groups.length })
        // 让出事件循环，保证 UI 逐组刷新
        await new Promise((r) => setTimeout(r, 0))
      }

      if (!controller.signal.aborted) setSelectedMap(nextSelected)
    } finally {
      setAutoSelectRunning(false)
      setAutoSelectProgress({ done: 0, total: 0 })
      autoSelectAbortRef.current = null
    }
  }

  // 取消自动选择
  const cancelAutoSelect = () => {
    if (!autoSelectRunning) return
    autoSelectAbortRef.current?.abort()
    setAutoSelectRunning(false)
    setAutoSelectProgress({ done: 0, total: 0 })
  }

  // 计算相似：POST /api/similarity/stream，用 fetch 流式读 SSE 进度
  const computeSimilarity = async () => {
    if (computing || images.length === 0 || !method) return

    const controller = new AbortController()
    abortRef.current = controller
    setProgress({ done: 0, total: images.length })
    setComputing(true)
    try {
      const res = await fetch("/api/similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          method,
          paths: images.map((img) => img.path),
          params: methodConfig[method] || {}
        })
      })
      if (!res.ok || !res.body) return

      // 读取 SSE 流
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let sep
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue
            let evt
            try {
              evt = JSON.parse(line.slice(5).trim())
            } catch {
              continue
            }
            if (evt.kind === "progress") {
              setProgress({ done: evt.done, total: evt.total })
            } else if (evt.kind === "done") {
              setGroupsAndClearSelection(
                Array.isArray(evt.groups) ? evt.groups : []
              )
            }
          }
        }
      }
    } catch {
    } finally {
      setComputing(false)
      setProgress({ done: 0, total: 0 })
      abortRef.current = null
    }
  }

  // 取消正在进行相似度计算
  const cancelCompute = () => {
    if (!computing) return
    abortRef.current?.abort()
    setComputing(false)
    setProgress({ done: 0, total: 0 }) // 丢弃已计算的结果
  }

  const resetGroups = () => {
    setGroupsAndClearSelection([])
  }

  const value = {
    images,
    libraryLoading,
    loadFiles,
    groups,
    selectedMap,
    toggleImageInGroup,
    clearSelection,
    deleteSelected,
    hasSelection,
    method,
    setMethod,
    SIMILARITY_METHODS,
    computeSimilarity,
    cancelCompute,
    downloadSelected,
    computing,
    progress,
    methodConfig,
    getMethodConfig,
    setParamConfig,
    resetParamConfig,
    overlay,
    openOverlay,
    closeOverlay,
    resetGroups,
    autoSelectRunning,
    autoSelectProgress,
    autoSelectDims,
    runAutoSelect,
    cancelAutoSelect,
    roots,
    addRoot,
    removeRoot,
    refreshRoots,
    dirSelecting,
    dirSelectError,
    closeDirSelect
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
