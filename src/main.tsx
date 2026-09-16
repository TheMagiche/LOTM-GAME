import { createRoot } from 'react-dom/client'
import App from './App'
import { dismissLotmBootSplash } from './components/landing/preloadLandingAssets'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <App />,
)

requestAnimationFrame(() => {
  requestAnimationFrame(() => dismissLotmBootSplash())
})
