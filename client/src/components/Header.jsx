import { useState, useEffect } from 'react';
import { BuyMeACoffeeButton } from './BuyMeACoffeeButton.jsx';
import { KoFiButton } from './KoFiButton.jsx';
import { api } from '../services/api.js';

export function Header() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <img src="/logo.png" alt="TMDB Discover+" className="logo-image" />
            <div>
              <h1>
                TMDB Discover<span className="plus">+</span>
              </h1>
              <span className="logo-subtitle">Custom Catalogs for Stremio</span>
            </div>
          </div>

          {stats && (
            <div className="header-stats">
              <span className="stats-item">
                <strong>{stats.totalUsers.toLocaleString()}</strong> users
              </span>
              <span className="stats-divider">•</span>
              <span className="stats-item">
                <strong>{stats.totalCatalogs.toLocaleString()}</strong> catalogs
              </span>
            </div>
          )}

          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KoFiButton />
            <BuyMeACoffeeButton />
          </div>
        </div>
      </div>
    </header>
  );
}
