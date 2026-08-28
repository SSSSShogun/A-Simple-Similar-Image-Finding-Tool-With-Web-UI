import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh"
import CalculateIcon from "@mui/icons-material/Calculate"
import ClearAllIcon from "@mui/icons-material/ClearAll"
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep"
import DownloadIcon from "@mui/icons-material/Download"
import SettingsIcon from "@mui/icons-material/Settings"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import { useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useApp } from "../context/AppContext"
import AutoSelectDialog from "./AutoSelectDialog"
import MethodConfigDialog from "./MethodConfigDialog"
import SimilarGroup from "./SimilarGroup"
import "../styles/result.scss"

function ResultPanel() {
  const { t } = useTranslation()
  const {
    images,
    groups,
    selectedMap,
    clearSelection,
    deleteSelected,
    hasSelection,
    method,
    setMethod,
    SIMILARITY_METHODS,
    computeSimilarity,
    downloadSelected,
    computing
  } = useApp()

  const selectedCount = Object.values(selectedMap).reduce(
    (acc, sel) => acc + Object.keys(sel || {}).length,
    0
  )

  // “删除所选”确认对话框
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 算法“配置”对话框
  const [configOpen, setConfigOpen] = useState(false)

  // “自动选择”对话框
  const [autoSelectOpen, setAutoSelectOpen] = useState(false)

  const handleConfirm = () => {
    deleteSelected()
    setConfirmOpen(false)
  }

  const calculateTotal = (arr) => {
    let total = 0
    arr.forEach(item => {
      total += item.items.length
    })
    return total
  }

  return (
    <section className="panel-result">
      <div className="panel-result__toolbar">
        <span className="panel-input__title">{t("resultPanel-1")}</span>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="method-select-label">{t("resultPanel-2")}</InputLabel>
          <Select
            labelId="method-select-label"
            label={t("resultPanel-2")}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {SIMILARITY_METHODS.map((m) => (
              <MenuItem key={m.id} value={m.id} disabled={m.disabled}>
                {t(m.name)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="contained"
          startIcon={<CalculateIcon />}
          onClick={computeSimilarity}
          disabled={method === "none" || computing || images.length === 0}
        >
          {computing ? t("resultPanel-3") : t("resultPanel-4")}
        </Button>

        <Button
          size="small"
          variant="outlined"
          aria-label={t("resultPanel-5")}
          startIcon={<SettingsIcon />}
          onClick={() => setConfigOpen(true)}
        >
          {t("resultPanel-6")}
        </Button>

        <span className="panel-result__spacer" />

        {groups.length > 0
          && (
            <span className="panel-input__count">
              {t("resultPanel-7", {
                group_count: groups.length,
                img_count: calculateTotal(groups)
              })}
            </span>
          )}

        <Button
          size="small"
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={() => setAutoSelectOpen(true)}
          disabled={groups.length === 0}
        >
          {t("resultPanel-8")}
        </Button>

        <Button
          size="small"
          variant="outlined"
          startIcon={<ClearAllIcon />}
          onClick={clearSelection}
          disabled={selectedCount === 0}
        >
          {t("resultPanel-9")}
        </Button>

        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadSelected}
          disabled={selectedCount === 0}
        >
          {t("resultPanel-10")}
        </Button>

        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          onClick={() => setConfirmOpen(true)}
          disabled={!hasSelection()}
        >
          {t("resultPanel-11")}
        </Button>
      </div>

      <div className="panel-result__groups">
        {groups.length === 0
          ? (
            <p className="result-empty">
              <Trans i18nKey={"resultPanel-12"} components={{ br: <br />, strong: <strong /> }} />
            </p>
          )
          : (
            groups.map((group, index) => (
              <SimilarGroup
                key={group.id}
                group={group}
                index={index}
              />
            ))
          )}
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="delete-confirm-title"
      >
        <DialogTitle id="delete-confirm-title">{t("resultPanel-13")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("resultPanel-14", { count: selectedCount })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            {t("resultPanel-15")}
          </Button>
          <Button onClick={handleConfirm} color="error" variant="contained">
            {t("resultPanel-16")}
          </Button>
        </DialogActions>
      </Dialog>

      <MethodConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        methodId={method}
      />

      <AutoSelectDialog
        open={autoSelectOpen}
        onClose={() => setAutoSelectOpen(false)}
      />
    </section>
  )
}

export default ResultPanel
