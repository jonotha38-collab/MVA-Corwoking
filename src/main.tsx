import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CoworkingProvider } from './context/CoworkingContext'
import './index.css'
import './theme.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <CoworkingProvider>
      <App />
    </CoworkingProvider>
  </StrictMode>,
)
