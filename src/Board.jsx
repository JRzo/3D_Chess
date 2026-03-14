import React, { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

function Square({ position, color }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1, 0.2, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Piece({ position, color }) {
  // simple visual for a piece
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 24, 24]} />
      <meshStandardMaterial color={color} metalness={0.3} />
    </mesh>
  )
}

export default function Board({ levels = 3 }) {
  const boards = useMemo(() => {
    const arr = []
    for (let L = 0; L < levels; L++) {
      for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
          const isDark = (x + z) % 2 === 1
          arr.push({ L, x, z, color: isDark ? '#5b3a29' : '#d9c4a6' })
        }
      }
    }
    return arr
  }, [levels])

  useFrame((state, delta) => {
    // optional animation placeholder
  })

  return (
    <group>
      {boards.map((s, i) => (
        <Square key={i} position={[s.x - 3.5, s.L * 1.2, s.z - 3.5]} color={s.color} />
      ))}

      {/* sample pieces to show levels */}
      <Piece position={[0, 0.3, 0]} color="#ffffff" />
      <Piece position={[1.5, 1.5, -1.5]} color="#000000" />
      <Piece position={[-2.5, 2.7, 2.5]} color="#ff4500" />
    </group>
  )
}
