"use client";

import { useEffect, useRef, useMemo } from "react";
import type { CityData } from "@/types/itinerary";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_STATIC_KEY ?? "";

// Grayscale map style — applied natively so markers stay in color
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "all", stylers: [{ saturation: -100 }] },
  { featureType: "water", stylers: [{ lightness: 30 }] },
];


interface CoverMapProps {
  cities: Record<string, CityData>;
}

export default function CoverMap({ cities }: CoverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const cityList = useMemo(() => Object.values(cities).filter((c) => c.lat && c.lng), [cities]);

  // Load the Google Maps script once
  useEffect(() => {
    if (typeof google !== "undefined" && google.maps) {
      initMap();
      return;
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => initMap());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when cities change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    updateMarkers();
    fitBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityList]);

  function initMap() {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 47, lng: 11.2 },
      zoom: 6,
      disableDefaultUI: true,
      gestureHandling: "none",
      keyboardShortcuts: false,
      styles: MAP_STYLES,
      backgroundColor: "#e5e5e5",
    });

    updateMarkers();
    fitBounds();
  }

  function updateMarkers() {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    cityList.forEach((city) => {
      const marker = new google.maps.Marker({
        position: { lat: city.lat, lng: city.lng },
        map,
        clickable: false,
      });
      markersRef.current.push(marker);
    });
  }

  function fitBounds() {
    const map = mapInstanceRef.current;
    if (!map || cityList.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    cityList.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
