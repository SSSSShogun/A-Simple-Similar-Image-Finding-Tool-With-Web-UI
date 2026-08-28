// 相似性算法的可配置参数，供 methodConfigDialog.jsx 对话框按需渲染。
//
// 每项参数：
//   key         参数标识，对应运行时传给算法的字段
//   label       界面显示名
//   options     允许的离散取值（数轴上的"点"），非无极调节
//   default     默认值（须在 options 中）
//   description 说明文字
// 为实现翻译，部分内容使用i18n key
export const METHOD_CONFIGS = {
  phash: {
    id: "phash",
    title: "methodConfig-1",
    params: [
      {
        key: "sampleSize",
        label: "methodConfig-2",
        options: [32, 64, 128],
        default: 32,
        description: "methodConfig-3"
      },
      {
        key: "dctBlock",
        label: "methodConfig-4",
        options: [8],
        default: 8,
        description: "methodConfig-5"
      },
      {
        key: "threshold",
        label: "methodConfig-6",
        options: [0, 5, 10, 15, 20],
        default: 10,
        description: "methodConfig-7"
      }
    ]
  }
}

// 取某方法的参数配置；未注册则返回 null
export function getMethodSchema(methodId) {
  return METHOD_CONFIGS[methodId] || null
}
