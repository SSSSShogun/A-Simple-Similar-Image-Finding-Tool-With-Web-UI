import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import trash from "trash"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..", "..")

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".tif",
  ".tiff"
])

const runtimeRoots = []
let envRoots = null

function normalizeAbs(raw) {
  return path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(PROJECT_ROOT, raw)
}

// 图片根目录列表
export function getImageRoots() {
  if (!envRoots) {
    const raw = process.env.IMG_ROOT || ""
    const parts = raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
    envRoots = parts.map(normalizeAbs)
  }
  const envLen = envRoots.length
  const all = [...envRoots, ...runtimeRoots]
  return all.map((abs, i) => ({
    id: `r${i + 1}`,
    abs,
    removable: i >= envLen // 由.env添加的目录不可移除
  }))
}

// 确保所有根目录存在
export function ensureRoot() {
  for (const root of getImageRoots()) {
    if (!fs.existsSync(root.abs)) fs.mkdirSync(root.abs, { recursive: true })
  }
}

// 按根 id 找到根
function findRoot(rootId) {
  return getImageRoots().find((r) => r.id === rootId) || null
}

// 解析根内相对定位；取出所属根，在该根内做防穿越绝对化
export function resolveSafe(loc) {
  const slash = loc.indexOf("/")
  if (slash <= 0) return null // 缺少 "rN/" 前缀
  const rootId = loc.slice(0, slash)
  const rel = loc.slice(slash + 1)
  const root = findRoot(rootId)
  if (!root) return null
  const abs = path.resolve(root.abs, rel)
  if (abs !== root.abs && !abs.startsWith(root.abs + path.sep)) {
    return null // 越出图片根目录
  }
  return abs
}

function isImage(fileName) {
  return IMAGE_EXTS.has(path.extname(fileName).toLowerCase())
}

// 列出所有根目录顶层（非递归）的图片
export function listImages() {
  ensureRoot()
  const out = []
  for (const root of getImageRoots()) {
    let entries
    try {
      entries = fs.readdirSync(root.abs)
    } catch {
      continue
    }
    for (const name of entries) {
      const abs = path.join(root.abs, name)
      let stat
      try {
        stat = fs.statSync(abs)
      } catch {
        continue
      }
      if (!stat.isFile() || !isImage(name)) continue
      out.push({
        path: `${root.id}/${name}`,
        name,
        size: stat.size,
        mtime: stat.mtimeMs
      })
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

// 列出当前全部根目录
export function listCurrentRoots() {
  return getImageRoots()
}

// 打开原生文件夹选择器
export function openNativeSelection(prompt) {
  return new Promise((resolve, reject) => {
    const script = `
      [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      Add-Type -AssemblyName System.Windows.Forms

      $desktop = [System.Windows.Forms.NativeWindow]::new()
    
      $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
      $dialog.Description = "${prompt}"
      $dialog.ShowNewFolderButton = $false
      $dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer

      $owner = New-Object System.Windows.Forms.Form
      $owner.ShowInTaskbar = $false
      $owner.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
      $owner.TopMost = $true
      $owner.Show()

      if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
        $dialog.SelectedPath
      } 
      
      $owner.Close()
    `
    execFile(
      "powershell.exe",
      ["NoProile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { timeout: 300000, windowsHide: false },
      (err, stdout, stderr) => {
        if (err) {
          console.error("PowerShell failed:", err)
          console.error("stderr:", stderr)
          reject(err)
          return
        }
        resolve(stdout.trim() || null)
      }
    )
  })
}

// 运行时添加根目录并校验：存在/为目录/去重。
export function addRoot(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, reason: "library-1" }
  }
  const abs = normalizeAbs(raw.trim())
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return { ok: false, reason: "library-2" }
  }
  const all = getImageRoots()
  if (all.some((r) => r.abs === abs)) {
    return { ok: false, reason: "library-3" }
  }
  runtimeRoots.push(abs)
  return { ok: true, roots: getImageRoots() }
}

// 移除运行时添加的根目录；由.env 添加的目录不可移除。
export function removeRoot(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, reason: "library-1" }
  }
  const abs = normalizeAbs(raw.trim())
  const idx = runtimeRoots.indexOf(abs)
  if (idx === -1) {
    return { ok: false, reason: "library-4" }
  }
  runtimeRoots.splice(idx, 1)
  return { ok: true, roots: getImageRoots() }
}

// 根据定位返回绝对路径
export function getImageFile(loc) {
  if (typeof loc !== "string" || !loc) return null
  const abs = resolveSafe(loc)
  if (!abs) return null
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null
  return abs
}

// 删除图片，使用trash库置入回收站
export async function deleteImage(loc) {
  if (typeof loc !== "string" || !loc) return false
  const abs = resolveSafe(loc)
  if (!abs) return false
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return false
  try {
    await trash(abs)
    return true
  } catch {
    return false
  }
}
