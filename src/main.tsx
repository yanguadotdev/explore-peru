import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import './styles/global.css'
import './lib/ease'
import App from './App'

/*
  SPA routes (like expedia.com/route66/states/<state>):
    /                     loader → hero → 3D map
    /regions/:regionId    the region page, opened over the map
  App is the layout route, so it never remounts while navigating: the WebGL
  world stays alive and the URL simply drives which region page is open.
*/
// No StrictMode: the WebGL layers are imperative singletons and must mount once.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={null} />
        <Route path="regions/:regionId" element={null} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>,
)
