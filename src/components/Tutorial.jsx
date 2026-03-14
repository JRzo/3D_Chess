import { useState } from 'react';

const STEPS = [
  { icon: '♟', title: 'Welcome to 3D Chess!',    text: 'A fully 3D chess experience with ranks, levels, and achievements. Every game earns you XP!' },
  { icon: '👆', title: 'Selecting Pieces',        text: 'Click any of your pieces to select it. Valid moves glow green on the board.' },
  { icon: '⬆',  title: 'Moving',                  text: 'Click a highlighted green square to move your piece there. Captures work the same way.' },
  { icon: '🎥', title: 'Camera Controls',         text: 'Click & drag to rotate. Scroll to zoom. Right-click & drag to pan.' },
  { icon: '⭐', title: 'Earning XP',              text: 'Win = 200 XP · Draw = 75 XP · Loss = 25 XP. Level up to unlock new ranks!' },
  { icon: '👑', title: 'Ranks',                   text: 'Bronze → Silver (Lv5) → Gold (Lv10) → Platinum (Lv20) → Legend (Lv35). Climb them all!' },
];

export function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  return (
    <div className="overlay-backdrop">
      <div className="tutorial-card">
        <button className="close-btn" onClick={onClose}>✕</button>
        <div className="tutorial-icon">{s.icon}</div>
        <h3 className="tutorial-title">{s.title}</h3>
        <p className="tutorial-text">{s.text}</p>
        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'dot-active' : ''}`} onClick={() => setStep(i)} />
          ))}
        </div>
        <div className="tutorial-btns">
          {step > 0 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
          {step < STEPS.length - 1
            ? <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
            : <button className="btn-primary" onClick={onClose}>Let's Play!</button>
          }
        </div>
      </div>
    </div>
  );
}
