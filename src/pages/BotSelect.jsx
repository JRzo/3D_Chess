import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { BOT_LEVELS } from '../lib/bot';

function getGauntletProgress() {
  try { return parseInt(localStorage.getItem('chess3d-gauntlet') || '0', 10); }
  catch { return 0; }
}

export function BotSelect() {
  const navigate = useNavigate();
  const gauntletProgress = getGauntletProgress();
  const nextGauntletLevel = Math.min(gauntletProgress + 1, 5);

  return (
    <div className="page-root">
      <Navbar />
      <div className="bot-select-page">
        <div className="bot-select-header">
          <h2>Play vs Computer</h2>
          <p className="bot-select-sub">Choose your opponent's difficulty level</p>
        </div>

        <div className="bot-cards">
          {BOT_LEVELS.map(bot => (
            <button
              key={bot.level}
              className="bot-card"
              onClick={() => navigate(`/game/bot?difficulty=${bot.level}`)}
            >
              <div className="bot-card-icon">{bot.icon}</div>
              <div className="bot-card-body">
                <div className="bot-card-name" style={{ color: bot.color }}>{bot.name}</div>
                <div className="bot-card-elo">ELO {bot.elo}</div>
                <div className="bot-card-desc">{bot.desc}</div>
              </div>
              <div className="bot-card-bars">
                {[1,2,3,4,5].map(i => (
                  <div
                    key={i}
                    className="bot-bar"
                    style={{ background: i <= bot.level ? bot.color : 'rgba(255,255,255,0.1)' }}
                  />
                ))}
              </div>
              <div className="bot-card-arrow">→</div>
            </button>
          ))}
        </div>

        {/* Gauntlet shortcut */}
        <div className="gauntlet-cta">
          <div className="gauntlet-cta-icon">⚔️</div>
          <div className="gauntlet-cta-body">
            <div className="gauntlet-cta-title">Bot Gauntlet</div>
            <div className="gauntlet-cta-desc">
              {gauntletProgress === 5
                ? '🏆 Champion! You defeated all 5 bots.'
                : gauntletProgress === 0
                  ? 'Challenge all 5 bots in sequence. Can you become Champion?'
                  : `You've defeated ${gauntletProgress}/5 bots. Keep going!`}
            </div>
          </div>
          {gauntletProgress < 5 && (
            <button
              className="btn-play btn-play-gauntlet"
              onClick={() => navigate(`/game/bot?difficulty=${nextGauntletLevel}&gauntlet=1`)}
            >
              {gauntletProgress === 0 ? 'Start Gauntlet' : 'Continue ⚔️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
