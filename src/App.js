import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Orders from './pages/Orders';
import Products from './pages/Products';
import './index.css';

function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [fadeActive, setFadeActive] = useState(false);

  useEffect(() => {
    // Sync theme immediately on mount
    const savedTheme = localStorage.getItem('janani-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Start fading out slightly before removing from DOM
    const fadeTimer = setTimeout(() => {
      setFadeActive(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setAppLoading(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (appLoading) {
    return (
      <div className={`splash-screen ${fadeActive ? 'fade-out' : ''}`}>
        <div className="splash-content">
          <div className="splash-logo-container">
            <img src="/logo.png" alt="Janani Logo" className="splash-logo" />
          </div>
          <h1 className="splash-title">Janani Home Foods</h1>
          <p className="splash-subtitle">Premium Home Food Store</p>
          <div className="splash-loader-bar">
            <div className="splash-loader-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
