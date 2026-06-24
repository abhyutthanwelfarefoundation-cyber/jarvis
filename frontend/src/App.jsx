import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Friday from './pages/Friday';
import Harold from './pages/Harold';
import Zeus from './pages/Zeus';
import Stark from './pages/Stark';
import Tasks from './pages/Tasks';
import Research from './pages/Research';
import Settings from './pages/Settings';
import { useJarvis } from './hooks/useJarvis';
import './styles/global.css';

export default function App() {
  const jarvis = useJarvis();

  return (
    <BrowserRouter>
      {/*
        Desktop layout:  [BottomNav sidebar] [Page content]   — flex row
        Mobile layout:   [Page content] [BottomNav bar]        — flex column
      */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',     /* mobile default: column */
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
      }}
      className="app-root"
      >
        <style>{`
          @media (min-width: 1024px) {
            .app-root {
              flex-direction: row !important;
            }
          }
        `}</style>

        {/* Nav — renders as sidebar on desktop, bottom bar on mobile */}
        <BottomNav />

        {/* Page area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Routes>
            <Route path="/"         element={<Home     jarvis={jarvis} />} />
            <Route path="/friday"   element={<Friday   jarvis={jarvis} />} />
            <Route path="/harold"   element={<Harold   jarvis={jarvis} />} />
            <Route path="/zeus"     element={<Zeus     jarvis={jarvis} />} />
            <Route path="/stark"    element={<Stark    jarvis={jarvis} />} />
            <Route path="/tasks"    element={<Tasks    jarvis={jarvis} />} />
            <Route path="/research" element={<Research jarvis={jarvis} />} />
            <Route path="/settings" element={<Settings jarvis={jarvis} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}