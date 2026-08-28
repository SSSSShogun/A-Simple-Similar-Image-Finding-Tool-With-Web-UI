import { createTheme, CssBaseline, ThemeProvider } from "@mui/material"
import { useEffect, useMemo } from "react"
import { I18nextProvider } from "react-i18next"
import { useTranslation } from "react-i18next"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppProvider } from "./context/AppContext"
import ComparePage from "./pages/ComparePage"
import i18next from "./utils/i18next.js"
import "./styles/global.scss"

const App = () => {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.title = t("app-title")
    document.documentElement.lang = i18n.language
  }, [t, i18n.language])

  const theme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#4f8cff" },
      background: {
        default: "#0f1115",
        paper: "#1a1d24"
      }
    },
    shape: { borderRadius: 8 }
  })

  const router = useMemo(() =>
    createBrowserRouter([
      { path: "/", element: <ComparePage /> }
    ]), [])

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppProvider>
          <I18nextProvider i18n={i18next}>
            <RouterProvider router={router} />
          </I18nextProvider>
        </AppProvider>
      </ThemeProvider>
    </>
  )
}

export default App
