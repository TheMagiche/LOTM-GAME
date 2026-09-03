import { createRoot } from 'react-dom/client'
import App from './App'
import { LandingPage } from './components/landing/LandingPage'
import { IS_DEMO_MODE, shouldShowDemoLanding } from './config/demoMode'
import './index.css'

const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'

createRoot(document.getElementById('root')!).render(
  shouldShowDemoLanding(IS_DEMO_MODE, pathname) ? <LandingPage /> : <App />,
)
