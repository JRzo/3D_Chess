/**
 * Bot Gauntlet — Beat all 5 bots in sequence to become the champion.
 * Progress is persisted in localStorage: 'chess3d-gauntlet' = highest level beaten (0-5).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/Navbar';
import { BOT_LEVELS } from '../lib/bot';

const STORAGE_KEY = 'chess3d-gauntlet';

function getProgress() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10); }
  catch { return 0; }
}

const STAGE_STATUS = {
  locked:    { label: 'Locked',   icon: '🔒', cls: 'gauntlet-locked'   },
  current:   { label: 'Challenge',icon: '⚔️',  cls: 'gauntlet-current'  },
  defeated:  { label: 'Defeated', icon: '✓',   cls: 'gauntlet-defeated' },
  champion:  { label: 'Champion', icon: '👑',  cls: 'gauntlet-champion' },
};

export function Gauntlet() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [progress, setProgress] = useState(getProgress);
  const [showReset, setShowReset] = useState(false);

  // Sync progress from URL param set by GamePage after a gauntlet win
  useEffect(() => {
    const stored = getProgress();
    setProgress(stored);
  }, []);

  const handlePlay = (level) => {
    navigate(`/game/bot?difficulty=${level}&gauntlet=1`);
  };

  const handleReset = () => {
    localStorage.setItem(STORAGE_KEY, '0');
    setProgress(0);
    setShowReset(false);
  };

  const isChampion = progress >= 5;

  return (
    <div className="page-root">
      <Navbar />
      <div className="gauntlet-page">

        {/* Header */}
        <div className="gauntlet-header">
          <div className="gauntlet-title-row">
            <span className="gauntlet-trophy">{isChampion ? '🏆' : '⚔️'}</span>
            <div>
              <h1>Bot Gauntlet</h1>
              <p className="gauntlet-sub">
                {isChampion
                  ? 'You are the 3D Chess Champion! You have conquered all 5 opponents.'
                  : 'Defeat all 5 bots in order to become the ultimate 3D Chess Champion.'}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="gauntlet-progress-wrap">
            <div className="gauntlet-progress-label">{progress} / 5 defeated</div>
            <div className="gauntlet-progress-track">
              {BOT_LEVELS.map((b, i) => (
                <div
                  key={b.level}
                  className={`gauntlet-pip ${i < progress ? 'pip-done' : i === progress ? 'pip-current' : 'pip-locked'}`}
                  style={{ background: i < progress ? b.color : undefined }}
                />
              ))}
            </div>
          </div>
        </div>

        {isChampion && (
          <div className="gauntlet-champion-banner">
            <span className="champ-icon">👑</span>
            <div>
              <div className="champ-title">CHAMPION</div>
              <div className="champ-sub">Congratulations, {user?.username}! You've beaten every opponent.</div>
            </div>
          </div>
        )}

        {/* Bot cards */}
        <div className="gauntlet-stages">
          {BOT_LEVELS.map((bot, i) => {
            const beaten   = i < progress;
            const isCurrent = i === progress;
            const locked   = i > progress;

            let stateKey = locked ? 'locked' : beaten ? 'defeated' : 'current';
            if (isChampion && beaten) stateKey = 'defeated';
            const state = STAGE_STATUS[stateKey];

            return (
              <div key={bot.level} className={`gauntlet-stage ${state.cls}`}>
                {/* Connector line */}
                {i > 0 && (
                  <div className={`gauntlet-connector ${i <= progress ? 'connector-done' : ''}`} />
                )}

                <div className="gauntlet-stage-inner">
                  <div className="gauntlet-stage-num">{i + 1}</div>
                  <div className="gauntlet-stage-icon" style={{ color: bot.color }}>{bot.icon}</div>
                  <div className="gauntlet-stage-body">
                    <div className="gauntlet-stage-name" style={{ color: bot.color }}>{bot.name}</div>
                    <div className="gauntlet-stage-elo">{bot.elo} ELO</div>
                    <div className="gauntlet-stage-desc">{bot.desc}</div>
                  </div>
                  <div className="gauntlet-stage-status">
                    <span className={`gauntlet-status-badge ${state.cls}-badge`}>
                      {state.icon} {state.label}
                    </span>
                    {isCurrent && (
                      <button
                        className="btn-play gauntlet-play-btn"
                        style={{ boxShadow: `3px 3px 0 ${bot.color}`, borderColor: '#1a1a1a' }}
                        onClick={() => handlePlay(bot.level)}
                      >
                        Fight! {bot.icon}
                      </button>
                    )}
                    {beaten && (
                      <button
                        className="btn-ghost"
                        onClick={() => handlePlay(bot.level)}
                      >
                        Rematch
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="gauntlet-footer">
          <button className="btn-ghost" onClick={() => navigate('/home')}>← Home</button>
          <button className="btn-ghost" onClick={() => setShowReset(v => !v)}>Reset Progress</button>
        </div>

        {showReset && (
          <div className="overlay-backdrop" onClick={() => setShowReset(false)}>
            <div className="confirm-card" onClick={e => e.stopPropagation()}>
              <h3>Reset Gauntlet Progress?</h3>
              <p>Your progress will be reset to zero. This cannot be undone.</p>
              <div className="confirm-actions">
                <button className="btn-danger" onClick={handleReset}>Yes, Reset</button>
                <button className="btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
