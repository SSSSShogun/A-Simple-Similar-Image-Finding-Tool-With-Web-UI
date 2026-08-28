import Button from "@mui/material/Button"
import { useTranslation } from "react-i18next"
import { useApp } from "../context/AppContext"
import "../styles/computing.scss"

// 原生文件夹选择器遮罩
function NativeSelectOverlay() {
  const { t } = useTranslation()
  const { dirSelecting, dirSelectError, closeDirSelect } = useApp()
  if (!dirSelecting) return null

  return (
    <div className="computing-overlay">
      <div className="computing-overlay__box">
        <div
          className="computing-overlay__text"
          style={dirSelectError ? { color: "#ff5c6c" } : undefined}
        >
          {dirSelectError || t("nativeSelectOverlay-1")}
        </div>
        {dirSelectError && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeDirSelect}
          >
            {t("nativeSelectOverlay-2")}
          </Button>
        )}
      </div>
    </div>
  )
}

export default NativeSelectOverlay
