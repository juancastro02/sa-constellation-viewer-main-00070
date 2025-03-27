"use client";

import { useRef, useEffect, useState } from "react";
import type { CelestialData, Star, Constellation } from "@/lib/types";
import { useTheme } from "next-themes";

interface SkyCanvasProps {
  skyData: CelestialData | null;
}

// Update the SkyCanvas component to use the theme
export default function SkyCanvas({ skyData }: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  // Only render on client-side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current || !skyData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const size = Math.min(window.innerWidth - 40, 800);
    canvas.width = size;
    // Increase height to better utilize vertical space
    canvas.height = Math.min(size, window.innerHeight - 150);

    // Determine colors based on theme
    const isDarkTheme = theme === "dark";
    const backgroundColor = isDarkTheme ? "#0f172a" : "#ffffff";
    const backgroundGradientEnd = isDarkTheme ? "#020617" : "#f5f5f5";
    const starColor = isDarkTheme ? "#ffffff" : "#000000";
    const textColor = isDarkTheme ? "#ffffff" : "#000000";
    const lineColor = isDarkTheme ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)";
    const horizonColor = isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)";

    // Create a gradient background
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );

    gradient.addColorStop(0, backgroundColor);
    gradient.addColorStop(1, backgroundGradientEnd);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some "atmosphere" glow at the bottom
    const horizonGradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
    horizonGradient.addColorStop(0, isDarkTheme ? "rgba(30, 41, 59, 0)" : "rgba(220, 220, 220, 0)");
    horizonGradient.addColorStop(1, isDarkTheme ? "rgba(30, 41, 59, 0.3)" : "rgba(220, 220, 220, 0.3)");

    ctx.fillStyle = horizonGradient;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

    // Calculate the radius with increased padding
    const padding = 30; // Reduced padding for more compact view
    const radius = Math.min(canvas.width, canvas.height) / 2 - padding;

    // Draw stars with enhanced visuals
    skyData.stars.forEach((star) => {
      drawStar(ctx, star, canvas.width, canvas.height, padding, starColor);
    });

    // Draw constellations
    skyData.constellations.forEach((constellation) => {
      drawConstellation(ctx, constellation, canvas.width, canvas.height, padding, lineColor, textColor);
    });

    // Draw cardinal directions and horizon
    drawCardinalDirections(ctx, canvas.width, canvas.height, radius, padding, textColor, horizonColor);
  }, [skyData, mounted, theme]);

  // Update the drawStar function to accept a color parameter
  const drawStar = (
    ctx: CanvasRenderingContext2D,
    star: Star,
    width: number,
    height: number,
    padding: number,
    color: string
  ) => {
    // Calculate center point
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate the radius with padding
    const radius = Math.min(width, height) / 2 - padding;

    // Calculate position with padding adjustment
    const azimuthRad = (star.azimuth * Math.PI) / 180;
    const altitudeRatio = (90 - star.altitude) / 90;

    // Calculate position from center
    const distance = altitudeRatio * radius;
    const x = centerX + distance * Math.sin(azimuthRad);
    const y = centerY - distance * Math.cos(azimuthRad);

    // Only draw stars that are above the horizon
    if (star.altitude > 0) {
      // Adjust star brightness
      const brightness = 0.8;
      const starRadius = Math.max(1, 3 * (star.magnitude / 6) * brightness);

      // Create gradient for star
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, starRadius * 2);

      // Star color based on magnitude (brighter stars are more blue/white)
      const starColor = color;

      gradient.addColorStop(0, starColor);
      gradient.addColorStop(0.5, `rgba(${color === "#ffffff" ? "255, 255, 255" : "0, 0, 0"}, ${0.5 * brightness})`);
      gradient.addColorStop(1, `rgba(${color === "#ffffff" ? "255, 255, 255" : "0, 0, 0"}, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, starRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add a subtle glow for brighter stars
      if (star.magnitude < 2) {
        ctx.beginPath();
        ctx.arc(x, y, starRadius * 3, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, starRadius * 3);
        glowGradient.addColorStop(0, `rgba(${color === "#ffffff" ? "255, 255, 255" : "0, 0, 0"}, ${0.2 * brightness})`);
        glowGradient.addColorStop(1, `rgba(${color === "#ffffff" ? "255, 255, 255" : "0, 0, 0"}, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }

      // Add star name if available
      if (star.name) {
        ctx.font = "10px Arial";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText(star.name, x, y + 12);
      }
    }
  };

  // Update the drawConstellation function to accept color parameters
  const drawConstellation = (
    ctx: CanvasRenderingContext2D,
    constellation: Constellation,
    width: number,
    height: number,
    padding: number,
    lineColor: string,
    textColor: string
  ) => {
    // Calculate center point
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate the radius with padding
    const radius = Math.min(width, height) / 2 - padding;

    // Use a more visible color for constellation lines
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    constellation.lines.forEach((line) => {
      // Calculate start position with padding adjustment
      const startAzimuthRad = (line.start.azimuth * Math.PI) / 180;
      const startAltitudeRatio = (90 - line.start.altitude) / 90;
      const startDistance = startAltitudeRatio * radius;
      const x1 = centerX + startDistance * Math.sin(startAzimuthRad);
      const y1 = centerY - startDistance * Math.cos(startAzimuthRad);

      // Calculate end position with padding adjustment
      const endAzimuthRad = (line.end.azimuth * Math.PI) / 180;
      const endAltitudeRatio = (90 - line.end.altitude) / 90;
      const endDistance = endAltitudeRatio * radius;
      const x2 = centerX + endDistance * Math.sin(endAzimuthRad);
      const y2 = centerY - endDistance * Math.cos(endAzimuthRad);

      // Only draw lines if both stars are above the horizon
      if (line.start.altitude > 0 && line.end.altitude > 0) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // Draw constellation name at center position
    if (constellation.center.altitude > 0 && constellation.lines.length > 0) {
      // Calculate center position with padding adjustment
      const centerAzimuthRad = (constellation.center.azimuth * Math.PI) / 180;
      const centerAltitudeRatio = (90 - constellation.center.altitude) / 90;
      const centerDistance = centerAltitudeRatio * radius;
      const x = centerX + centerDistance * Math.sin(centerAzimuthRad);
      const y = centerY - centerDistance * Math.cos(centerAzimuthRad);

      ctx.font = "12px Arial";
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.fillText(constellation.name, x, y);
    }
  };

  // Update the drawCardinalDirections function to accept color parameters
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

    // North
    ctx.fillText("N", centerX, centerY - radius - 5);

    // East
    ctx.fillText("E", centerX + radius + 5, centerY);

    // South
    ctx.fillText("S", centerX, centerY + radius + 15);

    // West
    ctx.fillText("W", centerX - radius - 5, centerY);

    // Draw horizon line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw altitude circles
    const altitudes = [30, 60];
    altitudes.forEach((alt) => {
      const altRadius = radius * (1 - alt / 90);
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, altRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Label the altitude
      ctx.fillStyle = textColor;
      ctx.font = "10px Arial";
      ctx.fillText(`${alt}°`, centerX + altRadius, centerY);
    });
  };

  // Show a loading placeholder until client-side rendering is complete
  if (!mounted) {
    return (
      <div className="relative rounded-xl overflow-hidden transition-colors p-4">
        <div className="w-full aspect-square bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden p-2 flex-1 min-h-0">
      <canvas ref={canvasRef} className="w-full h-full object-contain rounded-lg" style={{ aspectRatio: "auto" }} />
      {!skyData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-white">Loading sky data...</p>
        </div>
      )}
    </div>
  );
}
