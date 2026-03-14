import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import Board from './Board'
import useGamification from './gamification'

export default function Game() {
  const { xp, level, rank, addXP, achievements } = useGamification()

  const onMockMove = () => {
    addXP(25)
  }

  return (
    <div className="game-shell">
      <Canvas camera={{ position: [10, 12, 18], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <Board levels={3} />
        <OrbitControls />
      </Canvas>

      <div className="hud">
        <div className="hud-row">
          <div className="stat">
            <div className="label">Level</div>
            <div className="value">{level}</div>
          </div>
          <div className="stat">
            <div className="label">XP</div>
            <div className="value">{xp} / {level * 100}</div>
            <div className="xp-bar"><div style={{ width: Math.min(100, (xp / (level * 100)) * 100) + '%' }} /></div>
          </div>
          <div className="stat">
            <div className="label">Rank</div>
            <div className="value">{rank}</div>
          </div>
        </div>

        <div className="controls">
          <button onClick={onMockMove}>Make Move (+25 XP)</button>
          <button onClick={() => addXP(200)}>Win Match (+200 XP)</button>
        </div>

        <div className="achievements">
          <strong>Achievements</strong>
          <ul>
            {achievements.length === 0 && <li className="muted">No achievements yet</li>}
            {achievements.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      </div>

      <Html as="div" center position={[0, -3.8, 0]} style={{ pointerEvents: 'none' }}>
        <div className="footer-note">Tip: Orbit to inspect levels. Use the HUD to earn XP.</div>
      </Html>
    </div>
  )
}
