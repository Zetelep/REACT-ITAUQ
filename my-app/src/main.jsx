import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/ui.css'
import './index.css'
import App from './app/App.jsx'
import { AuthProvider } from './app/providers/AuthProvider'
import { ProfileProvider } from './app/providers/ProfileProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
