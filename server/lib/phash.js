import sharp from "sharp"

// 灰度化（ITU-R BT.601 luma）
export function rgbToGray(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// 一维 DCT-II
function dct1d(f, N) {
  const out = new Array(N)
  const s = Math.sqrt(2 / N)
  const s0 = Math.sqrt(1 / N)
  for (let u = 0; u < N; u += 1) {
    const a = u === 0 ? s0 : s
    let sum = 0
    for (let x = 0; x < N; x += 1) {
      sum += f[x] * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))
    }
    out[u] = a * sum
  }
  return out
}

// 2D DCT（分离式：先逐行、再逐列），返回 N×N 二维数组
export function dct2d(matrix, N) {
  const rows = matrix.map((row) => dct1d(row, N))
  const out = []
  for (let i = 0; i < N; i += 1) {
    const col = []
    for (let j = 0; j < N; j += 1) col.push(rows[j][i])
    out.push(dct1d(col, N))
  }
  return out
}

// 低频块 - 均值 - 逐位比较 - dctBlock² 位串
export function pHashFromDctBlock(block, dctBlock) {
  let sum = 0
  let count = 0
  for (let i = 0; i < dctBlock; i += 1) {
    for (let j = 0; j < dctBlock; j += 1) {
      if (i === 0 && j === 0) continue // 排除 DC
      sum += block[i][j]
      count += 1
    }
  }
  const mean = sum / count
  const bits = []
  for (let i = 0; i < dctBlock; i += 1) {
    for (let j = 0; j < dctBlock; j += 1) {
      bits.push(block[i][j] >= mean ? "1" : "0")
    }
  }
  return bits.join("")
}

// 读取图片并缩放到 size×size 灰度二维矩阵
async function readGrayMatrix(absPath, size) {
  const { data } = await sharp(absPath, { limitInputPixels: false })
    .resize(size, size, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const matrix = []
  for (let y = 0; y < size; y += 1) {
    const row = []
    for (let x = 0; x < size; x += 1) {
      row.push(data[y * size + x]) // 每像素 1 个灰度值（0-255）
    }
    matrix.push(row)
  }
  return matrix
}

// 计算某图片的 pHash
export async function computePHashFile(absPath, sampleSize = 32, dctBlock = 8) {
  const gray = await readGrayMatrix(absPath, sampleSize)
  const dct = dct2d(gray, sampleSize)
  const block = []
  for (let i = 0; i < dctBlock; i += 1) {
    block.push(dct[i].slice(0, dctBlock))
  }
  return pHashFromDctBlock(block, dctBlock)
}
