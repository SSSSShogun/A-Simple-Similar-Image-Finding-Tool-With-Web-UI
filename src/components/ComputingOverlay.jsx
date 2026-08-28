import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import { useTranslation } from "react-i18next"
import { useApp } from "../context/AppContext"
import "../styles/computing.scss"

// 相似性计算遮罩：计算相似时全屏显示处理进度与取消按钮。
function ComputingOverlay() {
  const { t } = useTranslation()
  const { computing, progress, cancelCompute } = useApp()
  if (!computing) return null

  const pct = progress.total > 0
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0

  return (
    <div className="computing-overlay">
      <div className="computing-overlay__box">
        <CircularProgress
          size={72}
          thickness={4}
          variant="determinate"
          value={pct}
        />
        <div className="computing-overlay__text">{t("computingOverlay-1")}</div>
        <div className="computing-overlay__count">
          {progress.done} / {progress.total}
        </div>
        <Button
          variant="outlined"
          color="error"
          onClick={cancelCompute}
        >
          {t("computingOverlay-2")}
        </Button>
      </div>
    </div>
  )
}

export default ComputingOverlay
