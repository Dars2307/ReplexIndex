import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { CompareProvider } from './lib/compare.tsx';
import { RouterProvider } from './lib/router.tsx';
import { ThemeProvider } from './lib/theme.tsx';
import { ToastProvider } from './lib/toast.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <CompareProvider>
              <App />
            </CompareProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </RouterProvider>
  </StrictMode>,
);
