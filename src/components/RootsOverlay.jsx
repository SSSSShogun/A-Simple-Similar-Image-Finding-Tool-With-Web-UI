import CloseIcon from "@mui/icons-material/Close"
import FolderIcon from "@mui/icons-material/Folder"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemText from "@mui/material/ListItemText"
import Typography from "@mui/material/Typography"
import { useTranslation } from "react-i18next"
import { useApp } from "../context/AppContext"

// 保留盘符 + 末尾两级，中间用省略号替换。
function shorten(abs) {
  const norm = String(abs || "").replace(/[\\/]+$/, "")
  const parts = norm.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 3) return norm
  const head = parts[0]
  const tail = parts.slice(-2).join("\\")
  return `${head}\\...\\${tail}`
}

// 已添加文件夹叠加层
function RootsOverlay({ open, onClose }) {
  const { roots, removeRoot, resetGroups } = useApp()
  const { t } = useTranslation()

  const handleRemove = async (abs) => {
    await removeRoot(abs)
    resetGroups()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          width: 420,
          height: 440
        }
      }}
    >
      <DialogTitle>{t("rootsOverlay-1")}</DialogTitle>
      <DialogContent dividers sx={{ overflowY: "auto" }}>
        {roots.length === 0
          ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t("rootsOverlay-2")}
            </Typography>
          )
          : (
            <List dense disablePadding>
              {roots.map((r) => (
                <ListItem
                  key={r.id}
                  secondaryAction={r.removable && (
                    <IconButton
                      edge="end"
                      aria-label={t("rootsOverlay-3")}
                      onClick={() => handleRemove(r.abs)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                >
                  <FolderIcon
                    fontSize="small"
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                  <ListItemText
                    primary={shorten(r.abs)}
                    title={r.abs}
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontFamily: "ui-monospace, Consolas, monospace",
                        fontSize: 13
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t("rootsOverlay-4")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RootsOverlay
