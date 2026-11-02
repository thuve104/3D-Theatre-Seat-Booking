"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useBookingStore } from "@/store/useBookingStore";

export const SeatPOVCamera: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();
  const {
    cameraMode,
    povMetrics,
    customAzimuthOffset,
    customPolarOffset,
    seatedFov,
    nudgeViewingAngle,
    setSeatedFov,
  } = useBookingStore();

  const desiredPosition = useRef(new THREE.Vector3(0, 12.5, 19.5));
  const currentLookAt = useRef(new THREE.Vector3(0, 3.2, -4));
  const desiredLookAt = useRef(new THREE.Vector3(0, 3.2, -4));
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isSeatedMode = cameraMode === "SEAT_POV" || cameraMode === "TRAILER_POV";

  // Update target camera position & orientation whenever seat or mode changes
  useEffect(() => {
    if (isSeatedMode && povMetrics) {
      const [cx, cy, cz] = povMetrics.cameraPosition;
      const [tx, ty, tz] = povMetrics.lookAtTarget;

      // Vector from THIS specific seat's eyes to the center of the cinema screen
      const dx = tx - cx;
      const dy = ty - cy;
      const dz = tz - cz;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      // Compute exact yaw and pitch from this seat to the screen center, plus user head-turn offset
      const baseYaw = Math.atan2(dx, dz);
      const basePitch = Math.atan2(dy, horizontalDist);

      const finalYaw = baseYaw + customAzimuthOffset;
      const finalPitch = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, basePitch + customPolarOffset)
      );

      const lookDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const newTx = cx + Math.sin(finalYaw) * Math.cos(finalPitch) * lookDist;
      const newTy = cy + Math.sin(finalPitch) * lookDist;
      const newTz = cz + Math.cos(finalYaw) * Math.cos(finalPitch) * lookDist;

      desiredPosition.current.set(cx, cy, cz);
      desiredLookAt.current.set(newTx, newTy, newTz);
    } else if (cameraMode === "TOP_DOWN") {
      desiredPosition.current.set(0, 27, 0.01);
      desiredLookAt.current.set(0, 0, -1.5);
    } else {
      desiredPosition.current.set(0, 12.5, 19.5);
      desiredLookAt.current.set(0, 3.2, -4);
    }
  }, [isSeatedMode, cameraMode, povMetrics, customAzimuthOffset, customPolarOffset]);

  // First-person mouse drag to look around from the chair & scroll wheel to zoom FOV
  useEffect(() => {
    if (!isSeatedMode) return;
    const domElement = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevPointerRef.current.x;
      const dy = e.clientY - prevPointerRef.current.y;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };
      // Dragging left/right turns head left/right around the fixed seat position
      nudgeViewingAngle(-dx * 0.0035, -dy * 0.003);
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setSeatedFov(useBookingStore.getState().seatedFov + e.deltaY * 0.03);
    };

    domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("wheel", onWheel);
    };
  }, [isSeatedMode, gl, nudgeViewingAngle, setSeatedFov]);

  useFrame((_, delta) => {
    const lerpFactor = Math.min(1, delta * 6.5);

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = isSeatedMode ? seatedFov : 50;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, lerpFactor);
        camera.updateProjectionMatrix();
      }
    }

    if (isSeatedMode) {
      // Directly interpolate camera to the exact seat eye coordinates WITHOUT OrbitControls clamping
      camera.position.lerp(desiredPosition.current, lerpFactor);
      currentLookAt.current.lerp(desiredLookAt.current, lerpFactor);
      camera.lookAt(currentLookAt.current);
    } else if (controlsRef.current) {
      camera.position.lerp(desiredPosition.current, lerpFactor * 0.6);
      controlsRef.current.target.lerp(desiredLookAt.current, lerpFactor * 0.6);
      controlsRef.current.update();
    }
  });

  // Disable OrbitControls completely when seated so it NEVER pulls the camera out of the chair!
  if (isSeatedMode) {
    return null;
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      minDistance={4}
      maxDistance={38}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2.02}
      dampingFactor={0.08}
      enableDamping
    />
  );
};
