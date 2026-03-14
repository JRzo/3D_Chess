import { useState, useEffect } from 'react'

const RANKS = [
  { name: 'Bronze', at: 1 },
  { name: 'Silver', at: 5 },
  { name: 'Gold', at: 10 },
  { name: 'Platinum', at: 20 },
  { name: 'Legend', at: 35 }
]

export default function useGamification() {
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [rank, setRank] = useState('Bronze')
  const [achievements, setAchievements] = useState([])

  useEffect(() => {
    // compute rank from level
    let current = RANKS[0].name
    for (let i = 0; i < RANKS.length; i++) {
      if (level >= RANKS[i].at) current = RANKS[i].name
    }
    setRank(current)
  }, [level])

  useEffect(() => {
    // simple persistence
    try {
      const raw = localStorage.getItem('3d-chess-player')
      if (raw) {
        const parsed = JSON.parse(raw)
        setXp(parsed.xp || 0)
        setLevel(parsed.level || 1)
        setAchievements(parsed.achievements || [])
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('3d-chess-player', JSON.stringify({ xp, level, achievements }))
    } catch (e) {}
  }, [xp, level, achievements])

  function addXP(amount) {
    setXp(prev => {
      const newXP = prev + amount
      const target = level * 100
      if (newXP >= target) {
        const carry = newXP - target
        const newLevel = level + 1
        setLevel(newLevel)
        setXp(carry)
        grantAchievementIfNeeded(newLevel)
      }
      return newXP >= target ? (newXP - target) : newXP
    })
  }

  function grantAchievementIfNeeded(newLevel) {
    const milestones = [3, 5, 10, 20]
    if (milestones.includes(newLevel)) {
      setAchievements(prev => [...prev, `Reached Level ${newLevel}`])
    }
  }

  return { xp, level, rank, addXP, achievements }
}
