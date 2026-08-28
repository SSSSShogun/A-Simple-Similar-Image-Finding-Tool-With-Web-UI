import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Slider from "@mui/material/Slider"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { getMethodSchema } from "../constants/methodConfigs"
import { useApp } from "../context/AppContext"

// 通用算法"配置"对话框：按方法的参数渲染滑块。
function MethodConfigDialog({ open, onClose, methodId }) {
  const { t } = useTranslation()
  const { getMethodConfig, setParamConfig, resetGroups } = useApp()

  const schema = getMethodSchema(methodId)
  const current = getMethodConfig(methodId)

  const [draft, setDraft] = useState({})

  // 打开时以当前配置初始化草稿；切换方法/关闭时重置
  useEffect(() => {
    if (open) {
      const init = {}
      ;(schema?.params || []).forEach((p) => {
        init[p.key] = current[p.key] !== undefined ? current[p.key] : p.default
      })
      setDraft(init)
    } else {
      setDraft({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, methodId])

  const handleRestore = () => {
    const init = {}
    ;(schema?.params || []).forEach((p) => {
      init[p.key] = p.default
    })
    setDraft(init)
  }

  const handleConfirm = () => {
    const changed = Object.entries(draft).some(
      ([key, value]) => (current[key] ?? undefined) !== value
    )
    Object.entries(draft).forEach(([key, value]) => {
      setParamConfig(methodId, key, value)
    })
    if (changed) resetGroups()
    onClose()
  }

  // 当前参数值显示：threshold 按百分比并折算为当前尺寸下的绝对位数
  const renderCurrent = (param) => {
    const val = draft[param.key]
    if (val === undefined) return ""
    if (param.key === "threshold") {
      const bitsParam = draft.dctBlock !== undefined ? "dctBlock" : "hashSize"
      const size = Number(draft[bitsParam] ?? current[bitsParam] ?? 32)
      const abs = Math.max(1, Math.round((val / 100) * size * size))
      return t("methodConfigOverlay-6", { val: val, abs: abs })
    }
    return t("methodConfigOverlay-7", { val: val })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t("methodConfigOverlay-1", { method: t(schema.title) ?? "unknown" })}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          overflowX: "hidden",
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" }
        }}
      >
        {!schema || schema.params.length === 0
          ? (
            <DialogContentText>
              {t("methodConfigOverlay-2")}
            </DialogContentText>
          )
          : (
            <Stack spacing={3} sx={{ py: 1 }}>
              {schema.params.map((param) => (
                <Box key={param.key}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {t(param.label)}
                    <Typography
                      component="span"
                      sx={{ ml: 1, color: "text.secondary" }}
                    >
                      {renderCurrent(param)}
                    </Typography>
                  </Typography>

                  <Slider
                    value={draft[param.key]}
                    min={Math.min(...param.options)}
                    max={Math.max(...param.options)}
                    step={null}
                    marks={param.options.map((v) => ({
                      value: v,
                      label: String(v)
                    }))}
                    onChange={(_, v) => setDraft((d) => ({ ...d, [param.key]: v }))}
                    valueLabelDisplay="auto"
                  />

                  <Typography variant="body2" color="text.secondary">
                    {t(param.description)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleRestore}
          color="inherit"
          disabled={!schema || schema.params.length === 0}
        >
          {t("methodConfigOverlay-3")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} color="inherit">
          {t("methodConfigOverlay-4")}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={!schema || schema.params.length === 0}
        >
          {t("methodConfigOverlay-5")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MethodConfigDialog
