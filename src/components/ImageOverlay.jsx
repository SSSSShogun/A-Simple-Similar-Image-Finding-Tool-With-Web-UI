import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import { IconButton } from "@mui/material"
import { useCallback, useEffect, useRef, useState } from "react"
import { useApp } from "../context/AppContext"
import "../styles/overlay.scss"

// 查看单张图片遮罩：放大、缩略图、上/下一张。
function ImageOverlay() {
  const { overlay, closeOverlay } = useApp()
  const { open, list, index } = overlay

  const [currentIndex, setCurrentIndex] = useState(index)
  const [showOriginal, setShowOriginal] = useState(false)
  const [isZoomable, setIsZoomable] = useState(false)

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = useState(false)

  // 缩略图栏
  const [hasOverflow, setHasOverflow] = useState(false)
  const thumbsRef = useRef(null)

  const overlayRef = useRef(null)
  const itemRef = useRef(null)

  const current = list[currentIndex]

  const THUMB_WIDTH = 64

  const getThumbUrl = useCallback((path) => {
    return `/api/files/thumb?path=${encodeURIComponent(path)}&w=${THUMB_WIDTH}`
  }, [])

  const thumbUrlCache = useRef(new Map())

  const getCachedThumbUrl = useCallback((path) => {
    if (!thumbUrlCache.current.has(path)) {
      thumbUrlCache.current.set(path, getThumbUrl(path))
    }
    return thumbUrlCache.current.get(path)
  }, [getThumbUrl])

  // 预加载相邻缩略图
  useEffect(() => {
    if (!open || list.length <= 1) return

    const preloadIndexes = [
      currentIndex - 5,
      currentIndex - 4,
      currentIndex - 3,
      currentIndex - 2,
      currentIndex - 1,
      currentIndex + 1,
      currentIndex + 2,
      currentIndex + 3,
      currentIndex + 4,
      currentIndex + 5
    ].filter(idx => idx >= 0 && idx < list.length)

    preloadIndexes.forEach(idx => {
      const img = new Image()
      img.src = getCachedThumbUrl(list[idx].path)
    })
  }, [currentIndex, list, open, getCachedThumbUrl])

  const reset = useCallback(() => {
    setShowOriginal(false)
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
    setHasDragged(false)
  }, [])

  useEffect(() => {
    if (open) {
      setCurrentIndex(index)
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, list])

  const handleQuit = (e) => {
    if (e.target === overlayRef.current) closeOverlay()
  }

  const moveTo = (nextIndex) => {
    setCurrentIndex(nextIndex)
    reset()
  }

  const handlePrev = (e) => {
    e.stopPropagation()
    if (currentIndex > 0) moveTo(currentIndex - 1)
  }

  const handleNext = (e) => {
    e.stopPropagation()
    if (currentIndex < list.length - 1) moveTo(currentIndex + 1)
  }

  // 判断图片是否需要放大
  useEffect(() => {
    if (!open || !current) return
    const probe = new Image()
    probe.src = current.url
    probe.onload = () => {
      const maxW = window.innerWidth * 0.87
      const maxH = window.innerHeight * 0.8
      setIsZoomable(
        probe.naturalWidth > maxW || probe.naturalHeight > maxH
      )
    }
    return () => {
      probe.onload = null
    }
  }, [open, currentIndex, current])

  const toggleOriginalSize = () => {
    if (hasDragged) return
    if (isZoomable) {
      setShowOriginal((s) => !s)
      setPosition({ x: 0, y: 0 })
    }
  }

  const handleMouseDown = (e) => {
    if (!showOriginal) return
    e.preventDefault()
    setHasDragged(false)
    setIsDragging(true)
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !showOriginal) return
    const nx = e.clientX - startPos.x
    const ny = e.clientY - startPos.y
    if (Math.abs(nx - position.x) > 2 || Math.abs(ny - position.y) > 2) {
      setHasDragged(true)
    }
    setPosition({ x: nx, y: ny })
  }

  const handleMouseUp = () => {
    if (!isDragging || !showOriginal) return
    setIsDragging(false)

    // 边界约束：防止图片被拖出可视区
    const imgEl = itemRef.current
    const box = overlayRef.current
    if (!imgEl || !box) return
    const imgRect = imgEl.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()

    let nx = position.x
    let ny = position.y
    if (imgRect.width <= boxRect.width) {
      nx = 0 // 图片比容器小，横向居中
    } else {
      if (imgRect.left > boxRect.left) nx -= imgRect.left - boxRect.left
      if (imgRect.right < boxRect.right) nx += boxRect.right - imgRect.right
    }
    if (imgRect.height <= boxRect.height) {
      ny = 0
    } else {
      if (imgRect.top > boxRect.top) ny -= imgRect.top - boxRect.top
      if (imgRect.bottom < boxRect.bottom) ny += boxRect.bottom - imgRect.bottom
    }
    if (nx !== position.x || ny !== position.y) setPosition({ x: nx, y: ny })
  }

  // 缩略图栏：根据是否溢出显示左右箭头
  useEffect(() => {
    if (!open) return
    const el = thumbsRef.current
    if (!el) return
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 3)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [open, list, currentIndex])

  // 当前项变化时，滚动缩略图栏到对应位置
  useEffect(() => {
    if (!open || !hasOverflow) return
    const thumbs = thumbsRef.current
    const active = thumbs?.querySelector(".overlay-thumb--active")
    if (thumbs && active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }, [open, currentIndex, hasOverflow])

  const scrollThumbs = (dir) => {
    const el = thumbsRef.current
    if (el) {
      el.scrollBy({ left: dir * 288, behavior: "smooth" })
    }
  }

  if (!open || !current) return null

  return (
    <div
      ref={overlayRef}
      className="overlay"
      onClick={handleQuit}
    >
      {list.length > 1 && (
        <IconButton
          className={`overlay__arrow overlay__arrow--left${
            currentIndex === 0 ? " is-disabled" : ""
          }`}
          onClick={handlePrev}
          size="large"
        >
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
      )}

      {list.length > 1 && (
        <IconButton
          className={`overlay__arrow overlay__arrow--right${
            currentIndex === list.length - 1 ? " is-disabled" : ""
          }`}
          onClick={handleNext}
          size="large"
        >
          <ChevronRightIcon fontSize="large" />
        </IconButton>
      )}

      <img
        ref={itemRef}
        decoding="async"
        className="overlay__image"
        src={current.url}
        alt={current.name}
        style={{
          maxWidth: showOriginal ? "none" : "87vw",
          maxHeight: showOriginal ? "none" : "80vh",
          cursor: isZoomable
            ? showOriginal
              ? isDragging
                ? "grabbing"
                : "grab"
              : "zoom-in"
            : "default",
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: showOriginal
            ? isDragging
              ? "none"
              : "transform 0.15s ease"
            : "max-width .3s ease, max-height .3s ease",
          userSelect: showOriginal ? "none" : "auto"
        }}
        onClick={toggleOriginalSize}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => {
          if (showOriginal) e.preventDefault()
        }}
      />

      {list.length > 1 && (
        <div className="overlay-thumbs">
          <button
            className="overlay-thumbs__nav overlay-thumbs__nav--left"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              scrollThumbs(-1)
            }}
            disabled={!hasOverflow}
          >
            <ChevronLeftIcon />
          </button>

          <div className="overlay-thumbs__bar" ref={thumbsRef}>
            {list.map((item, itemIdx) => (
              <img
                key={item.id}
                className={`overlay-thumbs__thumb${
                  itemIdx === currentIndex ? " overlay-thumb--active" : ""
                }`}
                src={getCachedThumbUrl(item.path)}
                loading="lazy"
                decoding="async"
                alt={item.name}
                onClick={(e) => {
                  e.stopPropagation()
                  moveTo(itemIdx)
                }}
              />
            ))}
          </div>

          <button
            className="overlay-thumbs__nav overlay-thumbs__nav--right"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              scrollThumbs(1)
            }}
            disabled={!hasOverflow}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageOverlay
