import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { BOT_LEVELS } from '../lib/bot';

export function BotSelect() {
  const navigate = useNavigate();

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
      </div>
    </div>
  );
}
