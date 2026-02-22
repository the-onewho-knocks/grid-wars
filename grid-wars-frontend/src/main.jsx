import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GridWars from './GridWars.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GridWars />
  </StrictMode>,
)
