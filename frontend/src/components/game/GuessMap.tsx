import React, { useEffect, useRef, useState } from 'react';
import './GuessMap.css';

interface GuessMapProps {
  onGuess: (lat: number, lon: number) => void;
  guessLocation: { lat: number; lng: number } | null;
  hasGuessed: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export const GuessMap: React.FC<GuessMapProps> = ({ onGuess, guessLocation, hasGuessed }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const initMap = () => {
      // Don't reinitialize if map already exists
      if (mapInstanceRef.current) {
        console.log('GuessMap: Map already initialized, skipping...');
        return;
      }

      if (!mapRef.current || !window.google) {
        console.log('GuessMap: Waiting for Google Maps API...');
        return;
      }

      console.log('GuessMap: Initializing map...');

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        disableDefaultUI: false,
        clickableIcons: false,
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);
      console.log('GuessMap: Map initialized successfully!');

      map.addListener('click', (event: any) => {
        if (!hasGuessed) {
          const lat = event.latLng.lat();
          const lon = event.latLng.lng();
          onGuess(lat, lon);
        }
      });
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, [hasGuessed, onGuess]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    if (guessLocation) {
      const map = mapInstanceRef.current;
      const savedCenter = map.getCenter();
      const savedZoom = map.getZoom();

      const marker = new window.google.maps.Marker({
        position: { lat: guessLocation.lat, lng: guessLocation.lng },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#d4a574',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        optimized: false,
      });

      markerRef.current = marker;
      marker.setMap(map);

      const restore = () => {
        if (savedCenter && savedZoom) {
          map.setCenter(savedCenter);
          map.setZoom(savedZoom);
        }
      };

      restore();
      setTimeout(restore, 0);
      setTimeout(restore, 10);
      setTimeout(restore, 50);
      setTimeout(restore, 100);

      setIsLocked(true);
      setIsExpanded(true);
    } else {
      setIsLocked(false);
    }
  }, [guessLocation]);

  useEffect(() => {
    if (mapInstanceRef.current && window.google) {
      setTimeout(() => {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }, 300);
    }
  }, [isExpanded]);

  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isLocked) {
      setTimeout(() => {
        if (!isLocked) {
          setIsExpanded(false);
        }
      }, 2000);
    }
  };

  console.log('GuessMap render!', { mapLoaded, hasGuessed, guessLocation });

  return (
    <div
      className={`guess-map-container ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={mapRef} className="guess-map" />
      {!mapLoaded && (
        <div className="map-instruction-mini">
          Loading map...
        </div>
      )}
      {mapLoaded && !guessLocation && !isExpanded && (
        <div className="map-instruction-mini">
          Click to place marker
        </div>
      )}
    </div>
  );
};
