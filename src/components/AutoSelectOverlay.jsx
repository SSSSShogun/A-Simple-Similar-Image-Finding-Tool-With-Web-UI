import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import { useTranslation } from "react-i18next"
import { useApp } from "../context/AppContext"
import "../styles/autoselect.scss"

// 自动选择遮罩：按相似组数显示进度 + 取消按钮。
function AutoSelectOverlay() {
  const { t } = useTranslation()
  const { autoSelectRunning, autoSelectProgress, cancelAutoSelect } = useApp()
  if (!autoSelectRunning) return null

  const pct = autoSelectProgress.total > 0
    ? Math.min(
      100,
      Math.round(
        (autoSelectProgress.done / autoSelectProgress.total) * 100
      )
    )
    : 0

  return (
    <div className="autoselect-overlay">
      <div className="autoselect-overlay__box">
        <CircularProgress
          size={72}
          thickness={4}
          variant="determinate"
          value={pct}
          sx={{
            "& .MuiCircularProgress-circle": {
              transition: "none"
            }
          }}
        />
        <div className="autoselect-overlay__text">{t("autoSelectOverlay-1")}</div>
        <div className="autoselect-overlay__count">
          {t("autoSelectOverlay-2", {
            done: autoSelectProgress.done,
            total: autoSelectProgress.total
          })}
        </div>
        <Button variant="outlined" color="error" onClick={cancelAutoSelect}>
          {t("autoSelectOverlay-3")}
        </Button>
      </div>
    </div>
  )
}

export default AutoSelectOverlay
