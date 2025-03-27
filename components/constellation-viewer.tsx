"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkyCanvas from "@/components/sky-canvas";
import SettingsModal from "@/components/settings-modal";
import { calculateCelestialPositions } from "@/lib/astronomy";
import type { Location, CelestialData } from "@/lib/types";
import { Settings, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConstellationViewer() {
  // Use client-side only state initialization to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [formattedDateTime, setFormattedDateTime] = useState<string>("");
  const [location, setLocation] = useState<Location>({
    latitude: 40.7128,
    longitude: -74.006,
    name: "New York, USA",
  });

  const [skyData, setSkyData] = useState<CelestialData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize date only on client side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setDateTime(now);
    setFormattedDateTime(now.toLocaleString());
  }, []);

  useEffect(() => {
    if (!dateTime) return;

    try {
      // Calculate star positions based on date/time and location
      const data = calculateCelestialPositions(dateTime, location);
      setSkyData(data);
    } catch (error) {
      console.error("Error calculating celestial positions:", error);
    }
  }, [dateTime, location]);

  // Update formatted date string whenever dateTime changes
  useEffect(() => {
    if (dateTime) {
      setFormattedDateTime(dateTime.toLocaleString());
    }
  }, [dateTime]);

  const handleDateTimeChange = (newDateTime: Date) => {
    try {
      // Validate that it's a proper Date object
      if (!(newDateTime instanceof Date) || isNaN(newDateTime.getTime())) {
        console.error("Invalid date provided:", newDateTime);
        return;
      }
      setDateTime(newDateTime);
    } catch (error) {
      console.error("Error setting date time:", error);
    }
  };

  const handleLocationChange = (newLocation: Location) => {
    setLocation(newLocation);
  };

  // Show a loading state until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="grid gap-4">
        <div className="h-12 bg-gray-100 animate-pulse rounded-md"></div>
        <div className="h-[450px] bg-gray-100 animate-pulse rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 h-[calc(100vh-5rem)]">
      <Card className="flex-1 border-border overflow-hidden bg-background min-h-0">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <SkyCanvas skyData={skyData} />

            <div className="w-full p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 border-t border-border">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {location.name}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({location.latitude.toFixed(2)}, {location.longitude.toFixed(2)})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{formattedDateTime}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 border-border text-foreground hover:bg-accent/50 dark:hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dateTime && (
        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          location={location}
          dateTime={dateTime}
          onLocationChange={handleLocationChange}
          onDateTimeChange={handleDateTimeChange}
        />
      )}
    </div>
  );
}
