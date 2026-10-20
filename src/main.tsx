import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/foundation.css';
import './styles/catalog.css';
import './styles/navigation.css';
import './styles/accents.css';
import './styles/merchant.css';
import './styles/product-form.css';
import './styles/surfaces.css';
import './styles/filters.css';
import './styles/notifications.css';
import { AuthProvider } from './lib/auth.tsx';
import { ThemeProvider } from './lib/theme.tsx';
import { LanguageProvider } from './lib/i18n.tsx';
import { CartProvider } from './lib/cart.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider><App /></CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
