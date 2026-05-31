import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

// Last-resort guard: a render-time throw anywhere in the tree would otherwise blank
// the whole app to a white screen. Show a calm fallback with a reload instead.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error('[app error]', err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: '#283027' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong.</h1>
        <p style={{ color: '#6b7280' }}>Please reload the page. If it keeps happening, call (214) 415-9558.</p>
        <button onClick={() => location.reload()} style={{ borderRadius: 9999, background: '#6B8F71', color: '#fff', padding: '0.625rem 1.5rem', fontWeight: 600 }}>Reload</button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
