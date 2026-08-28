// 自动选择因素：方向（升/降序）由用户在对话框中选择
export const AUTO_SELECT_FACTORS = [
  {
    key: "resolution",
    label: "autoSelectFactors-1",
    getValue: (info) => info?.product ?? 0
  },
  {
    key: "size",
    label: "autoSelectFactors-2",
    getValue: (info) => info?.size ?? 0
  },
  {
    key: "mtime",
    label: "autoSelectFactors-3",
    getValue: (info) => info?.mtime ?? 0
  }
]

// 默认排列顺序（key 列表，自上而下为优先级从高到低）
export const DEFAULT_FACTOR_ORDER = ["resolution", "size", "mtime"]

// 便捷取因素定义
export function getFactor(key) {
  return AUTO_SELECT_FACTORS.find((f) => f.key === key) || null
}
