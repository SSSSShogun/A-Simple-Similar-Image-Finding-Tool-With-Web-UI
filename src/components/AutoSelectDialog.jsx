import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh"
import SortIcon from "@mui/icons-material/Sort"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  AUTO_SELECT_FACTORS,
  DEFAULT_FACTOR_ORDER,
  getFactor
} from "../constants/autoSelectFactors"
import { useApp } from "../context/AppContext"
import "../styles/autoselect.scss"

// 自动选择对话框：上下移动因素排序 + 每项升/降序切换。
function AutoSelectDialog({ open, onClose }) {
  const { t } = useTranslation()

  const { groups, runAutoSelect, autoSelectRunning } = useApp()

  const [order, setOrder] = useState(DEFAULT_FACTOR_ORDER)
  const [dirMap, setDirMap] = useState(() => {
    const m = {}
    AUTO_SELECT_FACTORS.forEach((f) => {
      m[f.key] = false // 默认降序（大值优先）
    })
    return m
  })

  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  const toggleDir = (key) => {
    setDirMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const factors = order
    .map((key) => {
      const def = getFactor(key)
      return def ? { key, def, asc: !!dirMap[key] } : null
    })
    .filter(Boolean)

  const handleApply = () => {
    if (groups.length === 0 || autoSelectRunning) return
    runAutoSelect(factors)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("autoSelect-1")}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>
          {t("autoSelect-2")}
        </DialogContentText>
        <Stack spacing={1}>
          {factors.map((f, i) => (
            <Box key={f.key} className="autoselect-row">
              <Box
                className="autoselect-row__rank"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                {i + 1}
              </Box>
              <Typography className="autoselect-row__label" sx={{ flex: 1 }}>
                {t(f.def.label)}
              </Typography>
              <Button
                size="small"
                variant={f.asc ? "outlined" : "contained"}
                color={f.asc ? "inherit" : "primary"}
                onClick={() => toggleDir(f.key)}
                startIcon={<SortIcon />}
              >
                {f.asc ? t("autoSelect-3") : t("autoSelect-4")}
              </Button>
              <IconButton
                size="small"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label={t("autoSelect-5")}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
                aria-label={t("autoSelect-6")}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t("autoSelect-7")}
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          startIcon={<AutoFixHighIcon />}
          disabled={groups.length === 0 || autoSelectRunning}
        >
          {t("autoSelect-8")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AutoSelectDialog
