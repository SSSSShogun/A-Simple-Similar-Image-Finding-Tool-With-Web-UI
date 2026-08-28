import Checkbox from "@mui/material/Checkbox"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useApp } from "../context/AppContext"

// 相似组
function SimilarGroup({ group, index }) {
  const { t } = useTranslation()
  const { selectedMap, toggleImageInGroup, openOverlay } = useApp()
  const groupSel = selectedMap[index] || {}
  const selectedCount = group.items.filter((it) => groupSel[it.id]).length

  const handlePreviewClick = (itemIdx) => {
    // 打开叠加层查看组内图片
    openOverlay(group.items, itemIdx)
  }

  const THUMB_WIDTH = 200

  const getThumbUrl = useCallback((path) => {
    return `/api/files/thumb?path=${encodeURIComponent(path)}&w=${THUMB_WIDTH}`
  }, [])

  return (
    <div className="similar-group">
      <div className="similar-group__head">
        <span className="similar-group__head-badge"># {index + 1}</span>
        <span className="similar-group__head-meta">
          {t("similarityGroup-1", { total: group.items.length, selected: selectedCount })}
        </span>
      </div>

      <div className="similar-group__body">
        {group.items.map((it, itIdx) => {
          const isSelected = !!groupSel[it.id]
          return (
            <div
              key={it.id}
              className={`preview${isSelected ? " is-selected" : ""}`}
              title={it.name}
              onClick={() => handlePreviewClick(itIdx)}
            >
              <div className="preview__img">
                <img src={getThumbUrl(it.path)} alt={it.name} loading="lazy" />
              </div>
              <div className="preview__foot">
                <Checkbox
                  className="preview__check"
                  size="small"
                  color="primary"
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleImageInGroup(index, it.id)}
                  inputProps={{
                    "aria-label": t("similarityGroup-2", { name: it.name })
                  }}
                />
                <span className="preview__name">{it.name}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SimilarGroup
