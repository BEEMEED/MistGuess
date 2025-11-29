import React, { useEffect, useRef } from 'react';
import './StreetViewPanorama.css';

interface StreetViewPanoramaProps {
  lat: number;
  lon: number;
}

declare global {
  interface Window {
    google: any;
  }
}

export const StreetViewPanorama: React.FC<StreetViewPanoramaProps> = ({ lat, lon }) => {
  const panoramaRef = useRef<HTMLDivElement>(null);
  const panoramaInstanceRef = useRef<any>(null);

  useEffect(() => {
    const initPanorama = () => {
      if (!panoramaRef.current || !window.google?.maps) {
        return;
      }

      const position = { lat, lng: lon };
      const streetViewService = new window.google.maps.StreetViewService();

      streetViewService.getPanorama(
        {
          location: position,
          radius: 50,
          source: window.google.maps.StreetViewSource.OUTDOOR,
        },
        (data: any, status: any) => {
          if (status === window.google.maps.StreetViewStatus.OK) {
            const panorama = new window.google.maps.StreetViewPanorama(panoramaRef.current!, {
              position: data.location.latLng,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: false,
              showRoadLabels: false,
              zoomControl: true,
              fullscreenControl: false,
              enableCloseButton: false,
              linksControl: true,
              panControl: true,
              motionTracking: false,
              motionTrackingControl: false,
            });

            panoramaInstanceRef.current = panorama;
          } else {
            if (panoramaRef.current) {
              panoramaRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:18px;">No Street View available</div>';
            }
          }
        }
      );
    };

    if (window.google?.maps) {
      initPanorama();
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogleMaps);
          initPanorama();
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, [lat, lon]);

  return (
    <div className="streetview-panorama-container">
      <div ref={panoramaRef} className="streetview-panorama" />
    </div>
  );
};
