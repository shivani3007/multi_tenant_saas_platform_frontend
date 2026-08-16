import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store';
import { SessionProvider } from './auth/SessionProvider';
import { App } from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html.');

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        {/* Auth and tenant identity are the only things in Context. */}
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
