import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder"
import ListIcon from "@mui/icons-material/List"
import RefreshIcon from "@mui/icons-material/Refresh"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useEffect, useRef, useState } from "react"
import { useApp } from "../context/AppContext"
import RootsOverlay from "./RootsOverlay"
import "../styles/input.scss"
import { Trans, useTranslation } from "react-i18next"

const THUMB = 96
const GAP = 10
const CELL = THUMB + GAP
const THUMB_WIDTH = 96

// 用 ResizeObserver 量取容器宽度
function useWidth(ref) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return width
}

const thumbUrl = (path) => `/api/files/thumb?path=${encodeURIComponent(path)}&w=${THUMB_WIDTH}`

function InputPanel() {
  const { images, libraryLoading, loadFiles, openOverlay, addRoot } = useApp()
  const scrollRef = useRef(null)
  const width = useWidth(scrollRef)
  const [rootsOpen, setRootsOpen] = useState(false)
  const { t, i18n } = useTranslation()

  useEffect(() => {
    loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columnCount = Math.max(1, Math.floor(width / CELL))
  const rowCount = Math.ceil(images.length / columnCount)

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CELL,
    overscan: 8
  })

  const handleOpen = useCallback(
    (targetIndex) => openOverlay(images, targetIndex),
    [images, openOverlay]
  )

  const handleOpenNative = async () => {
    await addRoot()
  }

  const handleChangeLanguage = () => {
    i18n.changeLanguage(i18n.language === "en-US" ? "zh-CN" : "en-US")
  }

  const renderThumb = (idx, keyPrefix) => {
    const img = images[idx]
    if (!img) return null
    return (
      <div
        className="thumb"
        key={`${keyPrefix}:${img.id}`}
        title={img.name}
        onClick={() => handleOpen(idx)}
      >
        <img src={thumbUrl(img.path)} alt={img.name} loading="lazy" />
        <span className="thumb__name">{img.name}</span>
      </div>
    )
  }

  return (
    <section className="panel-input">
      <div className="panel-input__toolbar">
        <span className="panel-input__title">{t("inputPanel-1")}</span>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadFiles}
          disabled={libraryLoading}
        >
          {libraryLoading ? t("inputPanel-3") : t("inputPanel-4")}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<CreateNewFolderIcon />}
          onClick={async () => handleOpenNative()}
        >
          {t("inputPanel-5")}
        </Button>
        <IconButton
          size="small"
          aria-label={t("inputPanel-6")}
          onClick={() => setRootsOpen(true)}
        >
          <ListIcon fontSize="small" />
        </IconButton>
        <p className="panel-input__lng" onClick={() => handleChangeLanguage()}>{i18n.language}</p>
        <span className="panel-input__count">{t("inputPanel-7", { count: images.length })}</span>
      </div>

      <div className="panel-input__grid" ref={scrollRef}>
        {images.length === 0
          ? (
            <div className="panel-input__empty">
              <p className="empty-hint">
                <Trans i18nKey={"inputPanel-2"} components={{ br: <br />, strong: <strong /> }} />
              </p>
            </div>
          )
          : (
            width > 0
            && columnCount > 0 && (
              <div
                className="panel-input__inner"
                style={{ height: rowVirtualizer.getTotalSize() }}
              >
                {rowVirtualizer.getVirtualItems().map((row) => {
                  const rowStart = row.index * columnCount
                  return (
                    <div
                      key={row.key}
                      className="panel-input__row"
                      style={{
                        transform: `translateY(${row.start}px)`,
                        height: row.size
                      }}
                    >
                      {Array.from({ length: columnCount }, (_, ci) =>
                        renderThumb(rowStart + ci, row.key))}
                    </div>
                  )
                })}
              </div>
            )
          )}
      </div>
      <RootsOverlay
        open={rootsOpen}
        onClose={() =>
          setRootsOpen(false)}
      />
    </section>
  )
}

export default InputPanel
