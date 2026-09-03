import { createRoot } from 'react-dom/client'
import App from './App'
import { LandingPage } from './components/landing/LandingPage'
import { dismissLotmBootSplash } from './components/landing/preloadLandingAssets'
import { IS_DEMO_MODE, shouldShowDemoLanding } from './config/demoMode'
import './index.css'

const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
const showLanding = shouldShowDemoLanding(IS_DEMO_MODE, pathname)

createRoot(document.getElementById('root')!).render(
  showLanding ? <LandingPage /> : <App />,
)

if (!showLanding) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => dismissLotmBootSplash())
  })
}
