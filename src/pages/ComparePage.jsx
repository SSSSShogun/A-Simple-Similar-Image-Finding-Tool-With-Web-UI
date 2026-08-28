import React from "react"
import AutoSelectOverlay from "../components/AutoSelectOverlay"
import ComputingOverlay from "../components/ComputingOverlay"
import ImageOverlay from "../components/ImageOverlay"
import InputPanel from "../components/InputPanel"
import NativeSelectOverlay from "../components/NativeSelectOverlay"
import ResultPanel from "../components/ResultPanel"

// 主页面
function ComparePage() {
  return (
    <>
      <InputPanel />
      <ResultPanel />
      <ImageOverlay />
      <ComputingOverlay />
      <AutoSelectOverlay />
      <NativeSelectOverlay />
    </>
  )
}

export default ComparePage
