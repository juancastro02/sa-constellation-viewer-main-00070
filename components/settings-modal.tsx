"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, MapPin, Search, Loader2, AlertCircle, 
  CalendarClock, Compass, Calendar, Sparkles, Moon, Sun
} from "lucide-react";
import type { Location } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { popularCities } from "@/lib/city-data";
import { DateTimePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

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
  const [locationChanged, setLocationChanged] = useState(false);
  const [selectedCity, setSelectedCity] = useState<Location | null>(null);
  const [workingDate, setWorkingDate] = useState<Date>(new Date(dateTime.getTime()));
  const [dateTimeChanged, setDateTimeChanged] = useState(false);

  const timeSuggestions = [
    { label: "Now", icon: <Clock className="h-4 w-4" />, getTime: () => new Date() },
    { label: "Midnight", icon: <Moon className="h-4 w-4" />, time: "00:00" },
    { label: "Sunset", icon: <Sun className="h-4 w-4" />, time: "19:30" },
    { label: "Sunrise", icon: <Sparkles className="h-4 w-4" />, time: "05:30" },
  ];

  const hasLocationChanges = 
    Number.parseFloat(manualLocation.latitude) !== location.latitude || 
    Number.parseFloat(manualLocation.longitude) !== location.longitude || 
    manualLocation.name !== location.name;

  const hasDateTimeChanges = workingDate.getTime() !== dateTime.getTime();
  const hasChanges = locationChanged || dateTimeChanged;

  useEffect(() => {
    if (open) {
      setActiveTab("location");
      
      setManualLocation({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        name: location.name,
      });

      setWorkingDate(new Date(dateTime.getTime()));
      setLocationChanged(false);
      setDateTimeChanged(false);
      
      const matchingCity = popularCities.find(
        city => Math.abs(city.latitude - location.latitude) < 0.01 && 
               Math.abs(city.longitude - location.longitude) < 0.01
      );
      
      setSelectedCity(matchingCity || null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, location, dateTime]);

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

  useEffect(() => {
    if (debouncedSearchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = popularCities.filter((loc) => 
      loc.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ).slice(0, 15);

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
    setSearchQuery("");
    setLocationChanged(true);
    setSelectedCity(loc);
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
    if (field === "latitude" || field === "longitude") {
      const error = validateCoordinate(field as "latitude" | "longitude", value);

      setLocationError((prev) => ({
        ...prev,
        [field]: error,
      }));

      setManualLocation((prev) => ({
        ...prev,
        [field]: value,
      }));
      
      setSelectedCity(null);
    } else {
      setManualLocation((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    setLocationChanged(true);
  };

  const handleDateTimeChange = (newDate: Date) => {
    setWorkingDate(newDate);
    setDateTimeChanged(true);
  };

  const handleTimePreset = (preset: typeof timeSuggestions[0]) => {
    if (preset.getTime) {
      const now = preset.getTime();
      setWorkingDate(now);
      setDateTimeChanged(true);
    } else if (preset.time) {
      try {
        const [hours, minutes] = preset.time.split(":").map(Number);
        const newDate = new Date(workingDate);
        newDate.setHours(hours, minutes);
        setWorkingDate(newDate);
        setDateTimeChanged(true);
      } catch (error) {
        console.error("Error setting preset time:", error);
      }
    }
  };

  const handleSave = () => {
    if (locationChanged) {
      const lat = Number.parseFloat(manualLocation.latitude);
      const lng = Number.parseFloat(manualLocation.longitude);

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
        onLocationChange({ latitude: lat, longitude: lng, name });
      }
    }

    if (dateTimeChanged) {
      onDateTimeChange(workingDate);
    }

    onOpenChange(false);
  };

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lng).toFixed(2)}° ${lngDir}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95%] mx-auto bg-background text-foreground p-0 max-h-[90vh] sm:max-h-[85vh] md:max-h-[80vh] lg:max-h-[75vh] border-border">
        <div className="flex flex-col h-full max-h-full">
          <div className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-foreground/10 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-foreground" />
                </div>
                <span>Sky View Settings</span>
              </DialogTitle>
            </DialogHeader>
          </div>

          <Tabs defaultValue="location" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 sm:px-6 py-2">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 dark:bg-muted/20 p-1">
                <TabsTrigger
                  value="location"
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-foreground/70"
                >
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </TabsTrigger>
                <TabsTrigger
                  value="datetime"
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-foreground/70"
                >
                  <Clock className="h-4 w-4" />
                  <span>Date & Time</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
              <TabsContent
                value="location"
                className="space-y-6 data-[state=inactive]:hidden outline-none"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-foreground" />
                    <h3 className="text-base font-medium text-foreground">Search Location</h3>
                  </div>

                  <div className="relative">
                    <div className="bg-background border border-input hover:border-input/80 focus-within:border-muted-foreground rounded-md overflow-hidden transition-colors">
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
                    <div className="mt-2 max-h-[150px] overflow-y-auto pr-1 space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1 pl-1">Search Results</h4>
                      <div className="grid gap-1">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            className={cn(
                              "p-2 border text-left rounded-md hover:bg-accent/50 cursor-pointer transition-colors",
                              selectedCity?.name === result.name ? "border-foreground/50 bg-foreground/5" : "border-input"
                            )}
                            onClick={() => handleSelectLocation(result)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className={cn(
                                "h-4 w-4 shrink-0", 
                                selectedCity?.name === result.name ? "text-foreground" : "text-muted-foreground"
                              )} />
                              <div>
                                <div className="font-medium text-foreground text-sm">{result.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCoordinates(result.latitude, result.longitude)}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {debouncedSearchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="flex items-center justify-center p-3 text-foreground bg-muted/50 rounded-md text-sm gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span>No locations found. Try a different search or use coordinates.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-foreground" />
                    <h3 className="text-base font-medium text-foreground">Manual Coordinates</h3>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-sm text-foreground">
                        Location Name <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <div className="bg-background border border-input hover:border-input/80 focus-within:border-muted-foreground rounded-md overflow-hidden transition-colors">
                        <Input
                          id="name"
                          placeholder="My Location"
                          value={manualLocation.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="border-0 text-foreground w-full focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="latitude" className="text-sm text-foreground">
                          Latitude <span className="text-xs text-muted-foreground">(-90 to 90)</span>
                        </Label>
                        <div className="space-y-1">
                          <div
                            className={`bg-background border ${
                              locationError?.latitude
                                ? "border-destructive"
                                : "border-input hover:border-input/80 focus-within:border-muted-foreground"
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
                            <div className="flex items-center text-destructive text-xs gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>{locationError.latitude}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="longitude" className="text-sm text-foreground">
                          Longitude <span className="text-xs text-muted-foreground">(-180 to 180)</span>
                        </Label>
                        <div className="space-y-1">
                          <div
                            className={`bg-background border ${
                              locationError?.longitude
                                ? "border-destructive"
                                : "border-input hover:border-input/80 focus-within:border-muted-foreground"
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
                            <div className="flex items-center text-destructive text-xs gap-1">
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
                className="space-y-6 data-[state=inactive]:hidden outline-none"
              >
                <div className="p-3 border border-border rounded-lg bg-foreground/5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-background flex items-center justify-center">
                        <CalendarClock className="h-4 w-4 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Current Selection</h4>
                        <p className="text-xs text-muted-foreground">
                          {workingDate.toLocaleDateString(undefined, { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {dateTimeChanged && (
                      <div className="rounded-full bg-foreground/10 p-1">
                        <Sparkles className="h-4 w-4 text-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-foreground" />
                    <h3 className="text-base font-medium text-foreground">Select Date & Time</h3>
                  </div>

                  <div className="relative z-10 flex justify-center bg-background border border-input p-3 rounded-lg">
                    <DateTimePicker 
                      value={workingDate} 
                      onChange={handleDateTimeChange} 
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground pl-1">Quick Time Selection</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {timeSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleTimePreset(suggestion)}
                          className="flex items-center justify-center gap-2 p-2 border border-input rounded-md hover:bg-accent/50 hover:border-input/80 transition-all"
                        >
                          {suggestion.icon}
                          <span className="text-sm font-medium">{suggestion.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>

            <div className="p-4 sm:p-6 pt-3 border-t border-border mt-auto bg-background">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 order-2 sm:order-1">
                  {hasChanges ? (
                    <>
                      <Sparkles className="h-3 w-3 text-foreground" />
                      <span>Changes will be applied when you save</span>
                    </>
                  ) : (
                    <>
                      <InfoIcon className="h-3 w-3" />
                      <span>No changes made</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="default" 
                    className="flex-1 sm:flex-none text-primary-foreground dark:text-background bg-foreground dark:bg-muted-foreground hover:bg-foreground/80 dark:hover:bg-foreground"
                    disabled={!hasChanges || !!locationError?.latitude || !!locationError?.longitude}
                  >
                    {hasChanges ? 'Apply Changes' : 'Close'}
                  </Button>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function Settings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
