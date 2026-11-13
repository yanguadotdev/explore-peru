import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './lib/ease'
import App from './App'

// No StrictMode: the WebGL layers are imperative singletons and must mount once.
createRoot(document.getElementById('root')!).render(<App />)
