/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

interface ProspectResult {
  business_name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  latitude: number;
  longitude: number;
  category: string;
  city: string;
  polygon_data: object | null;
}

interface ProspectingMapProps {
  businessType: string;
  city: string;
  onSearchResults: (results: ProspectResult[]) => void;
  onSearchStart: () => void;
  triggerSearch: number; // increment to trigger
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyA59hB4VCx6yKNG_LKwSsjvj3HgruGc82s';

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    if (document.querySelector('#google-maps-script')) {
      // Script already loading
      window.initGoogleMaps = () => resolve();
      return;
    }
    window.initGoogleMaps = () => resolve();
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=drawing,places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

export const ProspectingMap = ({ businessType, city, onSearchResults, onSearchStart, triggerSearch }: ProspectingMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const drawingManager = useRef<google.maps.drawing.DrawingManager | null>(null);
  const currentPolygon = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const lastTrigger = useRef(0);

  // Initialize map
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    loadGoogleMaps().then(() => {
      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 40.4168, lng: -3.7038 }, // Madrid default
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstance.current = map;

      const dm = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT,
          drawingModes: [google.maps.drawing.OverlayType.POLYGON],
        },
        polygonOptions: {
          fillColor: '#84cc16',
          fillOpacity: 0.15,
          strokeColor: '#84cc16',
          strokeWeight: 2,
          editable: true,
          draggable: true,
        },
      });
      dm.setMap(map);
      drawingManager.current = dm;

      google.maps.event.addListener(dm, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        // Remove previous polygon
        if (currentPolygon.current) currentPolygon.current.setMap(null);
        currentPolygon.current = polygon;
        dm.setDrawingMode(null);
      });

      setMapReady(true);
    }).catch(console.error);

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
    };
  }, []);

  // Geocode city when it changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !city) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: city }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        mapInstance.current!.setCenter(results[0].geometry.location);
        mapInstance.current!.setZoom(13);
      }
    });
  }, [city, mapReady]);

  // Search handler
  const doSearch = useCallback(() => {
    if (!mapReady || !mapInstance.current) return;

    onSearchStart();
    setSearching(true);

    // Clear previous markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const map = mapInstance.current;
    const service = new google.maps.places.PlacesService(map);
    const bounds = currentPolygon.current
      ? getPolygonBounds(currentPolygon.current)
      : map.getBounds();

    if (!bounds) { setSearching(false); return; }

    const request: google.maps.places.TextSearchRequest = {
      query: businessType,
      bounds: bounds,
    };

    const allResults: ProspectResult[] = [];
    const polygonPath = currentPolygon.current?.getPath();
    const polygonData = polygonPath
      ? polygonPath.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
      : null;

    service.textSearch(request, (results, status, pagination) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        setSearching(false);
        onSearchResults([]);
        return;
      }

      const mapped = results
        .filter(r => {
          if (!polygonPath || !r.geometry?.location) return true;
          return google.maps.geometry?.poly?.containsLocation(r.geometry.location, currentPolygon.current!);
        })
        .map(r => {
          // Add marker
          const marker = new google.maps.Marker({
            position: r.geometry!.location!,
            map,
            title: r.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#84cc16',
              fillOpacity: 0.9,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
          markersRef.current.push(marker);

          return {
            business_name: r.name || 'Sin nombre',
            address: r.formatted_address || '',
            phone: null, // needs detail request
            website: null,
            rating: r.rating ?? null,
            review_count: r.user_ratings_total ?? null,
            latitude: r.geometry!.location!.lat(),
            longitude: r.geometry!.location!.lng(),
            category: businessType,
            city: city,
            polygon_data: polygonData,
          };
        });

      allResults.push(...mapped);

      // Fetch next page if available (up to 60 results)
      if (pagination?.hasNextPage && allResults.length < 60) {
        setTimeout(() => pagination.nextPage(), 300);
      } else {
        setSearching(false);
        onSearchResults(allResults);
      }
    });
  }, [mapReady, businessType, city, onSearchResults, onSearchStart]);

  // React to search trigger
  useEffect(() => {
    if (triggerSearch > lastTrigger.current) {
      lastTrigger.current = triggerSearch;
      doSearch();
    }
  }, [triggerSearch, doSearch]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center gradient-hero">
        <div className="text-center">
          <div className="h-16 w-16 text-primary/30 mx-auto mb-4">🗺️</div>
          <p className="text-heading font-semibold">Google Maps</p>
          <p className="text-sm text-muted-foreground mt-1">Configura tu API key para activar el mapa</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} className="absolute inset-0" />
      {searching && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl px-4 py-2 shadow-card flex items-center gap-2 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-heading">Buscando negocios…</span>
        </div>
      )}
    </>
  );
};

function getPolygonBounds(polygon: google.maps.Polygon): google.maps.LatLngBounds {
  const bounds = new google.maps.LatLngBounds();
  polygon.getPath().forEach(point => bounds.extend(point));
  return bounds;
}
