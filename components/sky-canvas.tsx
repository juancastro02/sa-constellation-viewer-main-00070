"use client";

import { useRef, useEffect, useState } from "react";
import type { CelestialData, Star, Constellation } from "@/lib/types";
import { useTheme } from "next-themes";

interface SkyCanvasProps {
  skyData: CelestialData | null;
  zoom?: number;
}

export default function SkyCanvas({ skyData, zoom = 1 }: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setForceUpdate(prev => prev + 1);
    }
  }, [theme, resolvedTheme, mounted]);

  useEffect(() => {
    if (!mounted || !canvasRef.current || !skyData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(window.innerWidth - 40, 800);
    canvas.width = size;
    canvas.height = Math.min(size, window.innerHeight - 150);

    const computedStyle = getComputedStyle(document.documentElement);
    
    const getHSLColor = (property: string): string => {
      const value = computedStyle.getPropertyValue(property).trim();
      return value ? `hsl(${value})` : '';
    };
    
    const isDarkTheme = resolvedTheme === "dark";
    
    const backgroundColor = getHSLColor('--background');

    const elementColor = isDarkTheme ? "#ffffff" : "#000000";
    const secondaryElementColor = isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)";
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 30 / zoom;
    const radius = Math.min(canvas.width, canvas.height) / 2 - padding;

    skyData.stars.forEach((star) => {
      drawStar(ctx, star, canvas.width, canvas.height, padding, elementColor, zoom);
    });

    skyData.constellations.forEach((constellation) => {
      drawConstellation(ctx, constellation, canvas.width, canvas.height, padding, secondaryElementColor, elementColor, zoom);
    });

    drawCardinalDirections(ctx, canvas.width, canvas.height, radius, padding, elementColor, secondaryElementColor);
  }, [skyData, mounted, theme, resolvedTheme, zoom, forceUpdate]);

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    star: Star,
    width: number,
    height: number,
    padding: number,
    color: string,
    zoom: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;

    const radius = Math.min(width, height) / 2 - padding;

    const azimuthRad = (star.azimuth * Math.PI) / 180;
    const altitudeRatio = (90 - star.altitude) / 90;

    const distance = altitudeRatio * radius * zoom;
    const x = centerX + distance * Math.sin(azimuthRad);
    const y = centerY - distance * Math.cos(azimuthRad);

    if (star.altitude > 0 && 
        x >= 0 && x <= width && 
        y >= 0 && y <= height) {
      const brightness = 0.9;
      const starRadius = Math.max(1, 2.5 * (star.magnitude / 6) * brightness * zoom);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, starRadius * 2);

      const colorValues = color === "#ffffff" ? "255, 255, 255" : "0, 0, 0";

      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, `rgba(${colorValues}, ${0.5 * brightness})`);
      gradient.addColorStop(1, `rgba(${colorValues}, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, starRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (star.magnitude < 2) {
        ctx.beginPath();
        ctx.arc(x, y, starRadius * 3, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, starRadius * 3);
        glowGradient.addColorStop(0, `rgba(${colorValues}, ${0.2 * brightness})`);
        glowGradient.addColorStop(1, `rgba(${colorValues}, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }

      if (star.name && star.magnitude < 3) {
        ctx.font = `${Math.max(10, 10 * zoom)}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText(star.name, x, y + 12 * zoom);
      }
    }
  };

  const drawConstellation = (
    ctx: CanvasRenderingContext2D,
    constellation: Constellation,
    width: number,
    height: number,
    padding: number,
    lineColor: string,
    textColor: string,
    zoom: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;

    const radius = Math.min(width, height) / 2 - padding;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    constellation.lines.forEach((line) => {
      const startAzimuthRad = (line.start.azimuth * Math.PI) / 180;
      const startAltitudeRatio = (90 - line.start.altitude) / 90;
      const startDistance = startAltitudeRatio * radius * zoom;
      const x1 = centerX + startDistance * Math.sin(startAzimuthRad);
      const y1 = centerY - startDistance * Math.cos(startAzimuthRad);

      const endAzimuthRad = (line.end.azimuth * Math.PI) / 180;
      const endAltitudeRatio = (90 - line.end.altitude) / 90;
      const endDistance = endAltitudeRatio * radius * zoom;
      const x2 = centerX + endDistance * Math.sin(endAzimuthRad);
      const y2 = centerY - endDistance * Math.cos(endAzimuthRad);

      if (line.start.altitude > 0 && line.end.altitude > 0 &&
          x1 >= 0 && x1 <= width && y1 >= 0 && y1 <= height &&
          x2 >= 0 && x2 <= width && y2 >= 0 && y2 <= height) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    if (constellation.center.altitude > 0 && constellation.lines.length > 0) {
      const centerAzimuthRad = (constellation.center.azimuth * Math.PI) / 180;
      const centerAltitudeRatio = (90 - constellation.center.altitude) / 90;
      const centerDistance = centerAltitudeRatio * radius * zoom;
      const x = centerX + centerDistance * Math.sin(centerAzimuthRad);
      const y = centerY - centerDistance * Math.cos(centerAzimuthRad);

      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        ctx.font = `${Math.max(12, 12 * zoom)}px Arial`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.fillText(constellation.name, x, y);
      }
    }
  };

  const drawCardinalDirections = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    radius: number,
    padding: number,
    textColor: string,
    lineColor: string
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.font = "12px Arial";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";

    ctx.fillText("N", centerX, centerY - radius - 5);

    ctx.fillText("E", centerX + radius + 5, centerY);

    ctx.fillText("S", centerX, centerY + radius + 15);

    ctx.fillText("W", centerX - radius - 5, centerY);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    const altitudes = [30, 60];
    altitudes.forEach((alt) => {
      const altRadius = radius * (1 - alt / 90);
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, altRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = "10px Arial";
      ctx.fillText(`${alt}°`, centerX + altRadius, centerY);
    });
  };

  if (!mounted) {
    return (
      <div className="relative rounded-xl overflow-hidden transition-colors p-4">
        <div className="w-full aspect-square bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden p-2 flex-1 min-h-0">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain rounded-lg" 
        style={{ aspectRatio: "auto" }} 
        key={`canvas-${forceUpdate}`}
      />
      {!skyData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-white">Loading sky data...</p>
        </div>
      )}
    </div>
  );
}
