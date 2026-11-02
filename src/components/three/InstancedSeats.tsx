"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Seat3DItem, useBookingStore } from "@/store/useBookingStore";

const SEAT_COLORS = {
  AVAILABLE: new THREE.Color("#22C55E"),   // Green: Available
  OCCUPIED: new THREE.Color("#EF4444"),    // Red: Occupied or sold
  SELECTED: new THREE.Color("#EAB308"),    // Yellow: Selected
  RESERVED: new THREE.Color("#3B82F6"),    // Blue: Temporarily reserved
  UNAVAILABLE: new THREE.Color("#6B7280"), // Grey: Unavailable
};

interface InstancedSeatsProps {
  onSelectSeat: (seat: Seat3DItem) => void;
}

export const InstancedSeats: React.FC<InstancedSeatsProps> = ({ onSelectSeat }) => {
  const baseMeshRef = useRef<THREE.InstancedMesh>(null);
  const backrestMeshRef = useRef<THREE.InstancedMesh>(null);
  const armrestMeshRef = useRef<THREE.InstancedMesh>(null);

  const {
    seats,
    selectedSeatIds,
    activePreviewSeatId,
    setHoveredSeat,
  } = useBookingStore();

  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const cushionGeometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(0.54, 0.34, 0.54);
    geom.translate(0, 0.22, 0);
    return geom;
  }, []);

  const backrestGeometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(0.54, 0.68, 0.14);
    geom.translate(0, 0.68, 0.2);
    return geom;
  }, []);

  const armrestGeometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(0.64, 0.12, 0.48);
    geom.translate(0, 0.48, 0.02);
    return geom;
  }, []);

  const seatMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.45,
        metalness: 0.18,
      }),
    []
  );

  const armrestMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#181a24",
        roughness: 0.6,
        metalness: 0.3,
      }),
    []
  );

  useEffect(() => {
    if (
      !baseMeshRef.current ||
      !backrestMeshRef.current ||
      !armrestMeshRef.current ||
      seats.length === 0
    )
      return;

    seats.forEach((seat, idx) => {
      tempObject.position.set(seat.posX, seat.posY, seat.posZ);
      tempObject.rotation.set(seat.rotX, seat.rotY, seat.rotZ);

      const scaleX =
        seat.category === "COUPLE"
          ? 1.32
          : seat.category === "RECLINER" || seat.category === "VIP"
          ? 1.15
          : 1.0;

      tempObject.scale.set(scaleX, 1, 1);
      tempObject.updateMatrix();

      baseMeshRef.current!.setMatrixAt(idx, tempObject.matrix);
      backrestMeshRef.current!.setMatrixAt(idx, tempObject.matrix);
      armrestMeshRef.current!.setMatrixAt(idx, tempObject.matrix);

      const isSelected = selectedSeatIds.includes(seat.seatId);
      const isPreviewTarget = activePreviewSeatId === seat.seatId;

      if (isSelected || isPreviewTarget) {
        tempColor.copy(SEAT_COLORS.SELECTED);
      } else if (seat.status === "BOOKED") {
        tempColor.copy(SEAT_COLORS.OCCUPIED);
      } else if (seat.status === "LOCKED") {
        tempColor.copy(SEAT_COLORS.RESERVED);
      } else if (seat.status === "UNAVAILABLE") {
        tempColor.copy(SEAT_COLORS.UNAVAILABLE);
      } else {
        tempColor.copy(SEAT_COLORS.AVAILABLE);
      }

      baseMeshRef.current!.setColorAt(idx, tempColor);
      backrestMeshRef.current!.setColorAt(idx, tempColor);
    });

    baseMeshRef.current.instanceMatrix.needsUpdate = true;
    backrestMeshRef.current.instanceMatrix.needsUpdate = true;
    armrestMeshRef.current.instanceMatrix.needsUpdate = true;
    if (baseMeshRef.current.instanceColor) baseMeshRef.current.instanceColor.needsUpdate = true;
    if (backrestMeshRef.current.instanceColor)
      backrestMeshRef.current.instanceColor.needsUpdate = true;
  }, [seats, selectedSeatIds, activePreviewSeatId, tempObject, tempColor]);

  const rowMarkers = useMemo(() => {
    const map = new Map<
      string,
      { leftX: number; rightX: number; y: number; z: number; category: string }
    >();
    seats.forEach((s) => {
      const existing = map.get(s.rowLabel);
      if (!existing) {
        map.set(s.rowLabel, {
          leftX: s.posX,
          rightX: s.posX,
          y: s.posY,
          z: s.posZ,
          category: s.category,
        });
      } else {
        if (s.posX < existing.leftX) existing.leftX = s.posX;
        if (s.posX > existing.rightX) existing.rightX = s.posX;
      }
    });
    return Array.from(map.entries());
  }, [seats]);

  const activeSeatObj = useMemo(
    () => seats.find((s) => s.seatId === activePreviewSeatId) || null,
    [seats, activePreviewSeatId]
  );

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && seats[e.instanceId]) {
      const seat = seats[e.instanceId];
      setHoveredSeat(seat);
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerOut = () => {
    setHoveredSeat(null);
    document.body.style.cursor = "auto";
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const seat = seats[e.instanceId];
    if (seat) {
      onSelectSeat(seat);
    }
  };

  return (
    <group>
      <instancedMesh
        ref={baseMeshRef}
        args={[cushionGeometry, seatMaterial, seats.length]}
        castShadow
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <instancedMesh
        ref={backrestMeshRef}
        args={[backrestGeometry, seatMaterial, seats.length]}
        castShadow
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <instancedMesh
        ref={armrestMeshRef}
        args={[armrestGeometry, armrestMaterial, seats.length]}
        onClick={handleClick}
      />

      {/* Stadium Step Risers Under Each Row for Realistic Depth & Elevation Reference */}
      {rowMarkers.map(([label, coords]) => {
        const rowWidth = Math.abs(coords.rightX - coords.leftX) + 3.2;
        return (
          <group key={label}>
            <mesh
              position={[0, coords.y / 2 - 0.02, coords.z]}
              receiveShadow
            >
              <boxGeometry args={[rowWidth, Math.max(0.1, coords.y), 1.32]} />
              <meshStandardMaterial color="#0d0f17" roughness={0.92} />
            </mesh>

            {/* Illuminated Gold Step Strip */}
            <mesh position={[0, coords.y + 0.01, coords.z - 0.64]}>
              <boxGeometry args={[rowWidth, 0.02, 0.03]} />
              <meshStandardMaterial
                color="#D4AF37"
                emissive="#D4AF37"
                emissiveIntensity={0.45}
              />
            </mesh>

            <Text
              position={[coords.leftX - 0.95, coords.y + 0.18, coords.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.34}
              color="#D4AF37"
              anchorX="center"
              anchorY="middle"
            >
              {label}
            </Text>
            <Text
              position={[coords.rightX + 0.95, coords.y + 0.18, coords.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.34}
              color="#D4AF37"
              anchorX="center"
              anchorY="middle"
            >
              {label}
            </Text>
          </group>
        );
      })}

      {/* Highlight Beacon on Currently Previewed Seat */}
      {activeSeatObj && (
        <group position={[activeSeatObj.posX, activeSeatObj.posY + 0.03, activeSeatObj.posZ]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.38, 0.48, 32]} />
            <meshBasicMaterial color="#D4AF37" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};
