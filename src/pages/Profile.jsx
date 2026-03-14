import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import api from '../lib/api';

const RANK_COLORS = { Legend:'#ffd700', Platinum:'#c8dde8', Gold:'#ffd700', Silver:'#c0c0c0', Bronze:'#cd7f32' };
const RANK_ICONS  = { Legend:'👑', Platinum:'💎', Gold:'🥇', Silver:'🥈', Bronze:'🥉' };

export function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwn = me?._id === id;

  useEffect(() => {
    Promise.all([api.get(`/users/${id}`), api.get(`/games/user/${id}`)])
      .then(([p, g]) => { setProfile(p.data); setGames(g.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-root"><Navbar /><div className="loading-msg">Loading…</div></div>;
  if (!profile) return <div className="page-root"><Navbar /><div className="loading-msg">Profile not found</div></div>;

  const { stats, achievements = [] } = profile;
  const xpPct = Math.min(100, Math.round((stats.xp / (stats.level * 100)) * 100));
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

  return (
    <div className="page-root">
      <Navbar />
      <div className="profile-page">

        <div className="profile-header">
          <div className="profile-av">{profile.avatar || '♟'}</div>
          <div className="profile-info">
            <h2>{profile.username}</h2>
            <div className="profile-rank" style={{ color: RANK_COLORS[stats.rank] }}>
              {RANK_ICONS[stats.rank]} {stats.rank}
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <p className="profile-joined">Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
          {isOwn && <button className="btn-secondary" onClick={() => navigate('/settings')}>Edit Profile</button>}
        </div>

        <div className="profile-xp-section">
          <span>Level {stats.level} — {stats.xp} / {stats.level * 100} XP</span>
          <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
        </div>

        <div className="stat-cards">
          {[['Wins',stats.wins],['Losses',stats.losses],['Draws',stats.draws],['Win Rate',`${winRate}%`],['Total',stats.totalGames]].map(([l,v]) => (
            <div key={l} className="stat-card"><div className="stat-val">{v}</div><div className="stat-lbl">{l}</div></div>
          ))}
        </div>

        <div className="profile-sections">
          <div className="profile-section">
            <h3>Achievements</h3>
            <div className="ach-grid">
              {achievements.map((a, i) => (
                <div key={i} className="ach-badge">🏆 {a.name}</div>
              ))}
              {achievements.length === 0 && <p className="empty">No achievements yet. Keep playing!</p>}
            </div>
          </div>

          <div className="profile-section">
            <h3>Game History</h3>
            {games.map(g => {
              const iw = g.white?.toString() === id;
              const won = (g.result === 'white' && iw) || (g.result === 'black' && !iw);
              const drew = g.result === 'draw';
              return (
                <div key={g._id} className="game-row">
                  <span className="game-vs">{g.whiteUsername} vs {g.blackUsername || 'AI'}</span>
                  <span className={`game-result ${won ? 'res-win' : drew ? 'res-draw' : 'res-loss'}`}>
                    {won ? 'Win' : drew ? 'Draw' : 'Loss'}
                  </span>
                  <span className="game-reason">{g.resultReason}</span>
                </div>
              );
            })}
            {games.length === 0 && <p className="empty">No games yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
