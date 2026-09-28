import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { CoworkingProvider } from './context/CoworkingContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoworkingProvider>
      <App />
    </CoworkingProvider>
  </StrictMode>,
)
