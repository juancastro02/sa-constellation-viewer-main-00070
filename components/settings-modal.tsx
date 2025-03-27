"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Search, Globe, Loader2, AlertCircle, CalendarClock } from "lucide-react";
import type { Location } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { popularCities } from "@/lib/city-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-picker";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
  dateTime: Date;
  onLocationChange: (location: Location) => void;
  onDateTimeChange: (date: Date) => void;
}

export default function SettingsModal({
  open,
  onOpenChange,
  location,
  dateTime,
  onLocationChange,
  onDateTimeChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("location");
  const [previousLocation, setPreviousLocation] = useState<Location>(location);
  const [previousDateTime, setPreviousDateTime] = useState<Date>(dateTime);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  // Location state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualLocation, setManualLocation] = useState({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    name: location.name,
  });
  const [locationError, setLocationError] = useState<{
    latitude?: string;
    longitude?: string;
  } | null>(null);
  const [showPopularCities, setShowPopularCities] = useState(true);
  const [locationChanged, setLocationChanged] = useState(false);

  // Date/Time state
  const [workingDate, setWorkingDate] = useState<Date>(new Date(dateTime.getTime()));
  const [date, setDate] = useState<Date | undefined>(workingDate);
  const [time, setTime] = useState(() => {
    try {
      return format(workingDate, "HH:mm");
    } catch (error) {
      console.error("Error formatting time:", error);
      return "00:00";
    }
  });
  const [dateTimeChanged, setDateTimeChanged] = useState(false);

  // Check if there are changes to save
  const hasLocationChanges = useMemo(() => {
    const lat = Number.parseFloat(manualLocation.latitude);
    const lng = Number.parseFloat(manualLocation.longitude);

    return lat !== location.latitude || lng !== location.longitude || manualLocation.name !== location.name;
  }, [manualLocation, location]);

  const hasDateTimeChanges = useMemo(() => {
    return workingDate.getTime() !== dateTime.getTime();
  }, [workingDate, dateTime]);

  const hasChanges = useMemo(() => {
    return locationChanged || dateTimeChanged;
  }, [locationChanged, dateTimeChanged]);

  // Store previous values when modal opens
  useEffect(() => {
    if (open) {
      setPreviousLocation(location);
      setPreviousDateTime(dateTime);

      // Reset working values to current values
      setManualLocation({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        name: location.name,
      });

      setWorkingDate(new Date(dateTime.getTime()));
      setDate(new Date(dateTime.getTime()));

      try {
        setTime(format(dateTime, "HH:mm"));
      } catch (error) {
        console.error("Error formatting time:", error);
        setTime("00:00");
      }

      // Reset change tracking
      setLocationChanged(false);
      setDateTimeChanged(false);
    }
  }, [open, location, dateTime]);

  // Update change tracking when values change
  useEffect(() => {
    if (open) {
      setLocationChanged(hasLocationChanges);
    }
  }, [open, hasLocationChanges]);

  useEffect(() => {
    if (open) {
      setDateTimeChanged(hasDateTimeChanges);
    }
  }, [open, hasDateTimeChanges]);

  // Handle search
  useEffect(() => {
    if (debouncedSearchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowPopularCities(true);
      return;
    }

    setIsSearching(true);
    setShowPopularCities(false);

    // Search through popular cities
    const results = popularCities.filter((loc) => loc.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

    setSearchResults(results);
    setIsSearching(false);
  }, [debouncedSearchQuery]);

  const handleSelectLocation = (loc: Location) => {
    setManualLocation({
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      name: loc.name,
    });
    setLocationError(null);
    setSearchQuery(""); // Clear search after selection
    setLocationChanged(true);
  };

  const validateCoordinate = (field: "latitude" | "longitude", value: string): string | undefined => {
    const num = Number.parseFloat(value);

    if (isNaN(num)) {
      return "Must be a valid number";
    }

    if (field === "latitude") {
      if (num < -90 || num > 90) {
        return "Latitude must be between -90 and 90";
      }
    } else if (field === "longitude") {
      if (num < -180 || num > 180) {
        return "Longitude must be between -180 and 180";
      }
    }

    return undefined;
  };

  const handleInputChange = (field: keyof typeof manualLocation, value: string) => {
    // If changing coordinates, clear the name if it was from a preset location
    if (field === "latitude" || field === "longitude") {
      // Validate the coordinate
      if (field === "latitude" || field === "longitude") {
        const error = validateCoordinate(field as "latitude" | "longitude", value);

        setLocationError((prev) => ({
          ...prev,
          [field]: error,
        }));
      }

      setManualLocation((prev) => ({
        ...prev,
        [field]: value,
        // Clear name when manually editing coordinates
        name: field === "latitude" || field === "longitude" ? value : "",
      }));
    } else {
      setManualLocation((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    setLocationChanged(true);
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      try {
        // Create a new date object to avoid reference issues
        const updatedDate = new Date(newDate);

        // Preserve the current time
        if (workingDate) {
          updatedDate.setHours(workingDate.getHours(), workingDate.getMinutes(), workingDate.getSeconds());
        }

        // Update the working date
        setWorkingDate(updatedDate);
        setDateTimeChanged(true);
      } catch (error) {
        console.error("Error setting time:", error);
        setWorkingDate(newDate);
        setDateTimeChanged(true);
      }
    }
  };

  const handleTimeChange = (value: string) => {
    // Store the input value regardless of validity
    setTime(value);

    // Only update the working date if the time format is valid
    if (date && /^\d{2}:\d{2}$/.test(value)) {
      try {
        const [hours, minutes] = value.split(":").map(Number);

        // Validate hours and minutes
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return; // Don't update if values are invalid
        }

        const newDate = new Date(date);
        newDate.setHours(hours, minutes);
        setWorkingDate(newDate);
        setDateTimeChanged(true);
      } catch (error) {
        console.error("Error parsing time:", error);
      }
    }
  };

  const handleTimePreset = (presetTime: string) => {
    handleTimeChange(presetTime);
    setDateTimeChanged(true);
  };

  const handleNow = () => {
    const now = new Date();
    setDate(now);
    setWorkingDate(now);
    setDateTimeChanged(true);
    try {
      const formattedTime = format(now, "HH:mm");
      setTime(formattedTime);
    } catch (error) {
      console.error("Error formatting now time:", error);
      setTime("00:00");
    }
  };

  const handleDateTimeChange = (newDate: Date) => {
    setWorkingDate(newDate);
    setDateTimeChanged(true);
  };

  const handleSave = () => {
    let hasAppliedChanges = false;

    // Apply location changes if they exist
    if (locationChanged) {
      const lat = Number.parseFloat(manualLocation.latitude);
      const lng = Number.parseFloat(manualLocation.longitude);

      // Validate coordinates
      const latError = validateCoordinate("latitude", manualLocation.latitude);
      const lngError = validateCoordinate("longitude", manualLocation.longitude);

      if (latError || lngError) {
        setLocationError({
          latitude: latError,
          longitude: lngError,
        });
        return;
      }

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const name = manualLocation.name.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        const newLocation = {
          latitude: lat,
          longitude: lng,
          name: name,
        };

        // Apply the location change
        onLocationChange(newLocation);
        hasAppliedChanges = true;
      }
    }

    // Apply date/time changes if they exist
    if (dateTimeChanged) {
      // Apply the date/time change
      onDateTimeChange(workingDate);
      hasAppliedChanges = true;
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95%] mx-auto bg-background text-foreground p-0 h-[90vh] sm:h-[90vh] md:h-[85vh] lg:h-[70vh] xl:h-[75vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="p-4 sm:p-6 pb-2 sm:pb-4 border-b">
            <DialogHeader>
              <DialogTitle>Sky View Settings</DialogTitle>
            </DialogHeader>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 sm:px-6 py-2">
              <TabsList className="grid w-full grid-cols-2 bg-muted dark:bg-muted/20">
                <TabsTrigger
                  value="location"
                  className="flex items-center gap-2 text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-foreground/70"
                >
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </TabsTrigger>
                <TabsTrigger
                  value="datetime"
                  className="flex items-center gap-2 text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-foreground/70"
                >
                  <Clock className="h-4 w-4" />
                  <span>Date & Time</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full px-4 sm:px-6 pb-4 overflow-y-auto">
                <div className="relative h-full">
                  <TabsContent
                    value="location"
                    className="space-y-4 mt-2 h-full"
                    forceMount={true}
                    style={{ display: activeTab === "location" ? "block" : "none" }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-foreground" />
                        <h3 className="text-lg font-medium text-foreground">Search Location</h3>
                      </div>

                      <div className="relative">
                        <div className="bg-background border border-input hover:border-input/80 focus-within:border-ring rounded-md overflow-hidden transition-colors">
                          <Input
                            placeholder="Start typing to search for a city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10 border-0 text-foreground w-full focus:ring-0 focus:ring-offset-0"
                          />
                        </div>
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                          </div>
                        )}
                      </div>

                      {searchResults.length > 0 && (
                        <div className="grid gap-2 mt-2 max-h-[120px] overflow-y-auto">
                          {searchResults.map((result, index) => (
                            <div
                              key={index}
                              className="p-2 border border-input rounded-md hover:bg-accent/50 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer transition-colors"
                              onClick={() => handleSelectLocation(result)}
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-foreground shrink-0" />
                                <div>
                                  <div className="font-medium text-foreground text-sm">{result.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {debouncedSearchQuery && !isSearching && searchResults.length === 0 && (
                        <div className="text-center p-2 text-foreground bg-muted rounded-md text-sm">
                          No locations found. Try a different search term or use manual coordinates.
                        </div>
                      )}

                      {showPopularCities && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium text-foreground mb-2">Popular Cities</h4>
                          <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pb-1">
                            {popularCities.slice(0, 18).map((city, index) => (
                              <div
                                key={index}
                                className="p-2 border border-input rounded-md hover:bg-accent/50 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer transition-colors"
                                onClick={() => handleSelectLocation(city)}
                              >
                                <div className="font-medium text-foreground truncate text-sm">{city.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-foreground" />
                        <h3 className="text-lg font-medium text-foreground">Manual Coordinates</h3>
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name" className="text-foreground">
                            Location Name (optional)
                          </Label>
                          <div className="bg-background border border-input hover:border-input/80 focus-within:border-ring rounded-md overflow-hidden transition-colors">
                            <Input
                              id="name"
                              placeholder="My Location"
                              value={manualLocation.name}
                              onChange={(e) => handleInputChange("name", e.target.value)}
                              className="border-0 text-foreground w-full focus:ring-0 focus:ring-offset-0"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="latitude" className="text-foreground">
                              Latitude (-90 to 90)
                            </Label>
                            <div className="space-y-1">
                              <div
                                className={`bg-background border ${
                                  locationError?.latitude
                                    ? "border-destructive"
                                    : "border-input hover:border-input/80 focus-within:border-ring"
                                } rounded-md overflow-hidden transition-colors`}
                              >
                                <Input
                                  id="latitude"
                                  placeholder="40.7128"
                                  value={manualLocation.latitude}
                                  onChange={(e) => handleInputChange("latitude", e.target.value)}
                                  type="number"
                                  min="-90"
                                  max="90"
                                  step="0.0001"
                                  className="border-0 text-foreground w-full focus:ring-0 focus:ring-offset-0"
                                />
                              </div>
                              {locationError?.latitude && (
                                <div className="flex items-center text-red-500 text-xs gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{locationError.latitude}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="longitude" className="text-foreground">
                              Longitude (-180 to 180)
                            </Label>
                            <div className="space-y-1">
                              <div
                                className={`bg-background border ${
                                  locationError?.longitude
                                    ? "border-destructive"
                                    : "border-input hover:border-input/80 focus-within:border-ring"
                                } rounded-md overflow-hidden transition-colors`}
                              >
                                <Input
                                  id="longitude"
                                  placeholder="-74.006"
                                  value={manualLocation.longitude}
                                  onChange={(e) => handleInputChange("longitude", e.target.value)}
                                  type="number"
                                  min="-180"
                                  max="180"
                                  step="0.0001"
                                  className="border-0 text-foreground w-full focus:ring-0 focus:ring-offset-0"
                                />
                              </div>
                              {locationError?.longitude && (
                                <div className="flex items-center text-red-500 text-xs gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{locationError.longitude}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="datetime"
                    className="space-y-4 h-full"
                    forceMount={true}
                    style={{ display: activeTab === "datetime" ? "block" : "none" }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-foreground" />
                        <h3 className="text-lg font-medium text-foreground">Select Date & Time</h3>
                      </div>

                      <div className="relative z-50">
                        <DateTimePicker value={workingDate} onChange={handleDateTimeChange} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={handleNow}
                          className="text-xs sm:text-sm border-border text-foreground hover:bg-accent/50 dark:hover:bg-accent transition-colors"
                        >
                          Now
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleTimePreset("00:00")}
                          className="text-xs sm:text-sm border-border text-foreground hover:bg-accent/50 dark:hover:bg-accent transition-colors"
                        >
                          Midnight
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleTimePreset("19:30")}
                          className="text-xs sm:text-sm border-border text-foreground hover:bg-accent/50 dark:hover:bg-accent transition-colors"
                        >
                          Sunset
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleTimePreset("05:30")}
                          className="text-xs sm:text-sm border-border text-foreground hover:bg-accent/50 dark:hover:bg-accent transition-colors"
                        >
                          Sunrise
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 pt-2 border-t mt-auto bg-background">
              <DialogFooter className="sm:justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white w-full sm:w-auto"
                  disabled={!hasChanges || !!locationError?.latitude || !!locationError?.longitude}
                >
                  Save Settings
                </Button>
              </DialogFooter>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
