"use client";

import React from "react";
import { Text } from "@react-three/drei";

interface AuditoriumShellProps {
  width: number;
  length: number;
  height: number;
  screenPositionZ: number;
  isTrailerPlaying: boolean;
}

export const AuditoriumShell: React.FC<AuditoriumShellProps> = ({
  width,
  length,
  height,
  screenPositionZ,
  isTrailerPlaying,
}) => {
  const halfW = width / 2 + 2.2;
  const halfL = length / 2 + 3.0;

  return (
    <group>
      {/* Carpeted Auditorium Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial color="#090a0f" roughness={0.92} />
      </mesh>

      {/* Left Acoustic Wall with Sconce Lighting Strips */}
      <mesh position={[-halfW, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.35, height, halfL * 2]} />
        <meshStandardMaterial color="#0d0e15" roughness={0.88} />
      </mesh>

      {/* Right Acoustic Wall */}
      <mesh position={[halfW, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.35, height, halfL * 2]} />
        <meshStandardMaterial color="#0d0e15" roughness={0.88} />
      </mesh>

      {/* Acoustic Ceiling Baffles */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial color="#050508" roughness={0.96} />
      </mesh>

      {/* Wall LED Accent Strips (Dimmed automatically during Trailer Playback) */}
      {[-8, -2, 4, 10].map((zPos) => (
        <group key={zPos}>
          <mesh position={[-halfW + 0.22, height * 0.48, zPos]}>
            <boxGeometry args={[0.06, 2.2, 0.14]} />
            <meshStandardMaterial
              color="#E50914"
              emissive="#E50914"
              emissiveIntensity={isTrailerPlaying ? 0.15 : 0.85}
            />
          </mesh>
          <mesh position={[halfW - 0.22, height * 0.48, zPos]}>
            <boxGeometry args={[0.06, 2.2, 0.14]} />
            <meshStandardMaterial
              color="#E50914"
              emissive="#E50914"
              emissiveIntensity={isTrailerPlaying ? 0.15 : 0.85}
            />
          </mesh>
        </group>
      ))}

      {/* Illuminated Emergency Exit Doors near Front Left & Right */}
      {[-halfW + 0.25, halfW - 0.25].map((xPos, idx) => (
        <group
          key={idx}
          position={[xPos, 1.3, screenPositionZ + 2.8]}
          rotation={[0, idx === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
        >
          {/* Door Frame */}
          <mesh>
            <boxGeometry args={[1.3, 2.5, 0.12]} />
            <meshStandardMaterial color="#151722" roughness={0.7} />
          </mesh>
          {/* Glowing Green EXIT Sign */}
          <mesh position={[0, 1.45, 0.08]}>
            <boxGeometry args={[0.72, 0.26, 0.06]} />
            <meshStandardMaterial
              color="#10B981"
              emissive="#10B981"
              emissiveIntensity={1.2}
            />
          </mesh>
          <Text
            position={[0, 1.45, 0.12]}
            fontSize={0.14}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            EXIT
          </Text>
        </group>
      ))}
    </group>
  );
};
