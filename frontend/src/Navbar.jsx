import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Sun, Moon } from 'lucide-react';
import './sidebar.css';
import { useTheme } from './hooks/useTheme.js';

export default function Navbar() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="navbar-simple-wrapper">
      <header className="navbar-simple glass">
        <Link to="/" className="logo">
          <span className="logo-text">BibliOS</span>
        </Link>

        <div className="navbar-actions">
          <button
            onClick={toggleTheme}
            className="navbar-simple-btn theme"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
          </button>

          <button
            onClick={handleLogin}
            className="navbar-simple-btn login"
          >
            <LogIn size={18} />
            <span>Iniciar Sesión</span>
          </button>
        </div>
      </header>
    </div>
  );
}