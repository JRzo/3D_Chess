import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RANK_COLORS = { Legend:'#ffd700', Platinum:'#c8dde8', Gold:'#ffd700', Silver:'#c0c0c0', Bronze:'#cd7f32' };

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/home',                  label: 'Home',    icon: '⊞' },
    { path: '/bots',                  label: 'Play Bot', icon: '🤖' },
    { path: '/game/solo',             label: 'Free Play', icon: '♟' },
    { path: `/profile/${user?._id}`,  label: 'Profile', icon: '👤' },
    { path: '/settings',              label: 'Settings', icon: '⚙' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/home')}>
        <span className="brand-icon">♟</span>
        <span className="brand-text">3D Chess</span>
      </div>
      <div className="navbar-links">
        {links.map(l => (
          <button
            key={l.path}
            className={`nav-link ${location.pathname.startsWith(l.path.split(':')[0]) ? 'active' : ''}`}
            onClick={() => navigate(l.path)}
          >
            <span className="nav-icon">{l.icon}</span>
            <span className="nav-label">{l.label}</span>
          </button>
        ))}
      </div>
      {user && (
        <div className="navbar-user" onClick={() => navigate(`/profile/${user._id}`)}>
          <span className="user-avatar-sm">{user.avatar || '♟'}</span>
          <div className="user-info-sm">
            <span className="user-name-sm">{user.username}</span>
            <span className="user-rank-sm" style={{ color: RANK_COLORS[user.stats?.rank] || '#cd7f32' }}>
              {user.stats?.rank} · Lv {user.stats?.level}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
