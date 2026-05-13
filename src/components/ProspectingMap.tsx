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
  businessTypes: string[];
  city: string;
  onSearchResults: (results: ProspectResult[]) => void;
  onSearchStart: () => void;
  triggerSearch: number; // increment to trigger
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDhskCCwV0rsG82j_SEOcEZ8SJnp9M-Rrg';

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=drawing,places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

export const ProspectingMap = ({ businessTypes, city, onSearchResults, onSearchStart, triggerSearch }: ProspectingMapProps) => {
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

  // Search handler using Places API (New) — subdivides bounds for more results
  const doSearch = useCallback(async () => {
    if (!mapReady || !mapInstance.current) return;

    onSearchStart();
    setSearching(true);

    // Clear previous markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const map = mapInstance.current;
    const mainBounds = currentPolygon.current
      ? getPolygonBounds(currentPolygon.current)
      : map.getBounds();

    if (!mainBounds) { setSearching(false); return; }

    const polygonPath = currentPolygon.current?.getPath();
    const polygonData = polygonPath
      ? polygonPath.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
      : null;

    try {
      const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;

      // Subdivide bounds into a 2x2 grid for broader coverage (up to 80 results)
      const subBounds = subdivideBounds(mainBounds, 3);
      const allResults: ProspectResult[] = [];
      const seenIds = new Set<string>();

      for (const bounds of subBounds) {
        for (const type of businessTypes) {
          try {
            const request = {
              textQuery: type,
              fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'nationalPhoneNumber', 'websiteURI', 'id'],
              locationRestriction: bounds,
              maxResultCount: 20,
            };

            // @ts-ignore
            const { places } = await Place.searchByText(request);
            if (!places) continue;

            for (const place of places as any[]) {
              const placeId = place.id;
              if (seenIds.has(placeId)) continue;
              seenIds.add(placeId);

              // Filter by polygon if drawn
              if (polygonPath && place.location) {
                const inside = google.maps.geometry?.poly?.containsLocation(place.location, currentPolygon.current!);
                if (!inside) continue;
              }

              const lat = place.location?.lat() ?? 0;
              const lng = place.location?.lng() ?? 0;

              const marker = new google.maps.Marker({
                position: { lat, lng },
                map,
                title: place.displayName,
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

              allResults.push({
                business_name: place.displayName || 'Sin nombre',
                address: place.formattedAddress || '',
                phone: place.nationalPhoneNumber || null,
                website: place.websiteURI || null,
                rating: place.rating ?? null,
                review_count: place.userRatingCount ?? null,
                latitude: lat,
                longitude: lng,
                category: type,
                city: city,
                polygon_data: polygonData,
              });
            }
          } catch (e) {
            console.warn('Sub-search failed:', e);
          }
        }
      }

      setSearching(false);
      onSearchResults(allResults);
    } catch (error) {
      console.error('Places search error:', error);
      setSearching(false);
      onSearchResults([]);
    }
  }, [mapReady, businessTypes, city, onSearchResults, onSearchStart]);

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

function subdivideBounds(bounds: google.maps.LatLngBounds, divisions: number): google.maps.LatLngBounds[] {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latStep = (ne.lat() - sw.lat()) / divisions;
  const lngStep = (ne.lng() - sw.lng()) / divisions;
  const result: google.maps.LatLngBounds[] = [];

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      const subSw = new google.maps.LatLng(sw.lat() + i * latStep, sw.lng() + j * lngStep);
      const subNe = new google.maps.LatLng(sw.lat() + (i + 1) * latStep, sw.lng() + (j + 1) * lngStep);
      result.push(new google.maps.LatLngBounds(subSw, subNe));
    }
  }
  return result;
}
