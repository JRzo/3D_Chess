import { useEffect } from 'react';

export function AchievementPopup({ achievement, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="achievement-popup">
      <div className="ach-icon">🏆</div>
      <div className="ach-content">
        <div className="ach-label">Achievement Unlocked!</div>
        <div className="ach-name">{achievement}</div>
      </div>
      <button className="ach-close" onClick={onClose}>✕</button>
    </div>
  );
}
