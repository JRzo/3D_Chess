import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const COLORS = {
  w: { color: '#f5f0e8', metalness: 0.35, roughness: 0.45 },
  b: { color: '#1c1c2e', metalness: 0.4,  roughness: 0.4  },
};
const SEL_COLOR = '#6ee7b7';

function SelectRing({ radius }) {
  return (
    <mesh position={[0, -0.04, 0]}>
      <cylinderGeometry args={[radius, radius, 0.025, 32]} />
      <meshStandardMaterial color={SEL_COLOR} emissive={SEL_COLOR} emissiveIntensity={0.6} transparent opacity={0.75} />
    </mesh>
  );
}

function Base({ c, r1, r2 }) {
  return (
    <mesh position={[0, 0.05, 0]} castShadow>
      <cylinderGeometry args={[r1, r2, 0.1, 20]} />
      <meshStandardMaterial {...c} />
    </mesh>
  );
}

function useFloat(selected, baseY) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (selected && ref.current) {
      ref.current.position.y = baseY + 0.12 + Math.sin(clock.elapsedTime * 3) * 0.04;
    } else if (ref.current) {
      ref.current.position.y = baseY;
    }
  });
  return ref;
}

export function Pawn({ color, position, selected }) {
  const c = COLORS[color];
  const ref = useFloat(selected, position[1]);
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <Base c={c} r1={0.27} r2={0.33} />
      <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.18, 0.24, 0.14, 16]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.34, 0]} castShadow><sphereGeometry args={[0.21, 16, 16]} /><meshStandardMaterial {...c} /></mesh>
      {selected && <SelectRing radius={0.38} />}
    </group>
  );
}

export function Rook({ color, position, selected }) {
  const c = COLORS[color];
  const ref = useFloat(selected, position[1]);
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <Base c={c} r1={0.28} r2={0.34} />
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.2, 0.26, 0.24, 16]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.46, 0]} castShadow><cylinderGeometry args={[0.26, 0.2, 0.08, 16]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[0.56, 0.18, 0.56]} /><meshStandardMaterial {...c} /></mesh>
      {/* battlements */}
      {[-0.18, 0.18].map(x => [-0.18, 0.18].map(z => (
        <mesh key={`${x}${z}`} position={[x, 0.72, z]} castShadow><boxGeometry args={[0.15, 0.14, 0.15]} /><meshStandardMaterial {...c} /></mesh>
      )))}
      {selected && <SelectRing radius={0.4} />}
    </group>
  );
}

export function Knight({ color, position, selected }) {
  const c = COLORS[color];
  const ref = useFloat(selected, position[1]);
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <Base c={c} r1={0.28} r2={0.34} />
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.2, 0.26, 0.22, 16]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.46, 0.06]} castShadow><boxGeometry args={[0.28, 0.44, 0.36]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.78, 0.14]} castShadow><sphereGeometry args={[0.19, 14, 14]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.64, 0.26]} castShadow><boxGeometry args={[0.12, 0.26, 0.08]} /><meshStandardMaterial {...c} /></mesh>
      {selected && <SelectRing radius={0.4} />}
    </group>
  );
}

export function Bishop({ color, position, selected }) {
  const c = COLORS[color];
  const ref = useFloat(selected, position[1]);
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <Base c={c} r1={0.27} r2={0.33} />
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.16, 0.25, 0.24, 16]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.48, 0]} castShadow><sphereGeometry args={[0.21, 16, 16]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.76, 0]} castShadow><coneGeometry args={[0.07, 0.22, 10]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.9, 0]} castShadow><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial {...c} /></mesh>
      {selected && <SelectRing radius={0.38} />}
    </group>
  );
}

export function Queen({ color, position, selected }) {
  const c = COLORS[color];
  const ref = useFloat(selected, position[1]);
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <Base c={c} r1={0.3} r2={0.36} />
      <mesh position={[0, 0.24, 0]} castShadow><cylinderGeometry args={[0.19, 0.28, 0.28, 18]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.52, 0]} castShadow><sphereGeometry args={[0.24, 18, 18]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.82, 0]} castShadow><sphereGeometry args={[0.09, 12, 12]} /><meshStandardMaterial {...c} /></mesh>
      {[0,1,2,3,4].map(i => (
        <mesh key={i} position={[Math.cos(i*Math.PI*2/5)*0.21, 0.72, Math.sin(i*Math.PI*2/5)*0.21]} castShadow>
          <sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial {...c} />
        </mesh>
      ))}
      {selected && <SelectRing radius={0.44} />}
    </group>
  );
}

export function King({ color, position, selected, inCheck }) {
  const c = COLORS[color];
  const ref = useFloat(selected || inCheck, position[1]);
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <Base c={c} r1={0.32} r2={0.38} />
      <mesh position={[0, 0.26, 0]} castShadow><cylinderGeometry args={[0.21, 0.3, 0.3, 18]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.52, 0]} castShadow><cylinderGeometry args={[0.25, 0.21, 0.1, 18]} /><meshStandardMaterial {...c} /></mesh>
      {/* cross */}
      <mesh position={[0, 0.76, 0]} castShadow><boxGeometry args={[0.1, 0.36, 0.1]} /><meshStandardMaterial {...c} /></mesh>
      <mesh position={[0, 0.88, 0]} castShadow><boxGeometry args={[0.3, 0.1, 0.1]} /><meshStandardMaterial {...c} /></mesh>
      {selected && <SelectRing radius={0.46} />}
      {inCheck && <pointLight color="#ff3333" intensity={3} distance={2.5} />}
    </group>
  );
}

const MAP = { p: Pawn, r: Rook, n: Knight, b: Bishop, q: Queen, k: King };

export function ChessPiece3D({ piece, color, position, selected, inCheck, onClick }) {
  const Comp = MAP[piece];
  if (!Comp) return null;
  return (
    <group onClick={onClick}>
      <Comp color={color} position={position} selected={selected} inCheck={inCheck} />
    </group>
  );
}
