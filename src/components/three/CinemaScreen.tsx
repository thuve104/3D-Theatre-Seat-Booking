"use client";

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { Html, Text } from "@react-three/drei";
import { useBookingStore } from "@/store/useBookingStore";
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "@/lib/youtube";

interface CinemaScreenProps {
  width: number;
  height: number;
  posZ: number;
  posY: number;
  posterUrl: string;
  trailerUrl: string;
  movieTitle: string;
  videoElement: HTMLVideoElement | null;
  youtubeIframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export const CinemaScreen: React.FC<CinemaScreenProps> = ({
  width,
  height,
  posZ,
  posY,
  posterUrl,
  trailerUrl,
  movieTitle,
  videoElement,
  youtubeIframeRef,
}) => {
  const { isTrailerPlaying, isMuted } = useBookingStore();
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [posterTexture, setPosterTexture] = useState<THREE.Texture | null>(null);

  const youtubeId = extractYouTubeId(trailerUrl);
  const isYouTube = youtubeId !== null;
  const effectivePosterUrl =
    (isYouTube ? getYouTubeThumbnailUrl(trailerUrl) : null) || posterUrl;

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      effectivePosterUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setPosterTexture(tex);
      },
      undefined,
      () => {
        setPosterTexture(null);
      }
    );
  }, [effectivePosterUrl]);

  useEffect(() => {
    if (!videoElement || isYouTube) return;
    const vTex = new THREE.VideoTexture(videoElement);
    vTex.colorSpace = THREE.SRGBColorSpace;
    vTex.minFilter = THREE.LinearFilter;
    vTex.magFilter = THREE.LinearFilter;
    setVideoTexture(vTex);
    return () => {
      vTex.dispose();
    };
  }, [videoElement, isYouTube]);

  const activeTexture =
    !isYouTube && isTrailerPlaying && videoTexture ? videoTexture : posterTexture;

  // In @react-three/drei, <Html transform distanceFactor={10}> scales 40px = 1 meter in 3D world space
  const htmlPixelWidth = Math.round(width * 40);
  const htmlPixelHeight = Math.round(height * 40);
  const youtubeEmbedUrl = isYouTube
    ? getYouTubeEmbedUrl(trailerUrl, { autoplay: true, muted: isMuted, controls: true })
    : null;

  return (
    <group position={[0, posY, posZ]}>
      {/* Acoustic Surround Baffle Wall & Masking Frame */}
      <mesh position={[0, 0, -0.22]}>
        <boxGeometry args={[width + 1.6, height + 1.2, 0.35]} />
        <meshStandardMaterial color="#07070b" roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Gold Trim Accent Below Screen */}
      <mesh position={[0, -height / 2 - 0.35, -0.05]}>
        <boxGeometry args={[width + 0.6, 0.08, 0.15]} />
        <meshStandardMaterial
          color="#D4AF37"
          emissive="#D4AF37"
          emissiveIntensity={0.45}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Main Silver High-Gain Cinema Screen */}
      <mesh>
        <planeGeometry args={[width, height, 32, 16]} />
        {activeTexture ? (
          <meshStandardMaterial
            map={activeTexture}
            emissive={new THREE.Color("#ffffff")}
            emissiveMap={activeTexture}
            emissiveIntensity={isTrailerPlaying ? 1.15 : 0.72}
            roughness={0.28}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial
            color="#0b0d14"
            emissive="#e50914"
            emissiveIntensity={0.2}
          />
        )}
      </mesh>

      {/* 3D Perspective-Transformed YouTube Player Mounted Directly on the 3D Cinema Screen */}
      {isYouTube && isTrailerPlaying && youtubeEmbedUrl && (
        <Html
          transform
          distanceFactor={10}
          position={[0, 0, 0.05]}
          style={{
            width: `${htmlPixelWidth}px`,
            height: `${htmlPixelHeight}px`,
            backgroundColor: "#000",
            overflow: "hidden",
            borderRadius: "4px",
            boxShadow: "0 0 60px rgba(229, 9, 20, 0.45)",
          }}
        >
          <iframe
            ref={youtubeIframeRef as React.RefObject<HTMLIFrameElement>}
            src={youtubeEmbedUrl}
            title={movieTitle}
            width={htmlPixelWidth}
            height={htmlPixelHeight}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </Html>
      )}

      {/* Screen Title Overlay when Trailer is Paused */}
      {!isTrailerPlaying && (
        <Text
          position={[0, -height / 2 + 0.65, 0.08]}
          fontSize={0.48}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {movieTitle} • {isYouTube ? "YOUTUBE 3D SCREEN READY" : "CINEVERSE 3D SCREEN"}
        </Text>
      )}

      {/* Stage Deck Below Screen */}
      <mesh position={[0, -posY + 0.25, 1.4]} receiveShadow>
        <boxGeometry args={[width + 4, 0.5, 3.4]} />
        <meshStandardMaterial color="#0d0e14" roughness={0.85} />
      </mesh>

      {/* Dynamic Screen Glow Illuminating Auditorium */}
      <pointLight
        position={[0, 0, 3.0]}
        intensity={isTrailerPlaying ? 22 : 8}
        distance={34}
        color={isTrailerPlaying ? "#d6e4ff" : "#e50914"}
      />
    </group>
  );
};
