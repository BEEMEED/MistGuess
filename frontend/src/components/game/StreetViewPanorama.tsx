import React, { useEffect, useRef } from 'react';
import './StreetViewPanorama.css';

interface StreetViewPanoramaProps {
  lat: number;
  lon: number;
  onPovChange?: (heading: number, pitch: number, zoom: number) => void;
  onPositionChange?: (lat: number, lng: number) => void;
  externalPov?: { heading: number; pitch: number; zoom: number } | null;
  externalPosition?: { lat: number; lng: number } | null;
  disableControls?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export const StreetViewPanorama: React.FC<StreetViewPanoramaProps> = ({ lat, lon, onPovChange, onPositionChange, externalPov, externalPosition, disableControls }) => {
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
              zoomControl: !disableControls,
              fullscreenControl: false,
              enableCloseButton: false,
              linksControl: !disableControls,
              panControl: !disableControls,
              clickToGo: !disableControls,
              scrollwheel: !disableControls,
              motionTracking: false,
              motionTrackingControl: false,
            });

            panoramaInstanceRef.current = panorama;

            if (onPovChange) {
              panorama.addListener('pov_changed', () => {
                const pov = panorama.getPov();
                onPovChange(pov.heading, pov.pitch, panorama.getZoom());
              });
            }

            if (onPositionChange || onPovChange) {
              panorama.addListener('position_changed', () => {
                const pos = panorama.getPosition();
                if (!pos) return;
                if (onPositionChange) {
                  onPositionChange(pos.lat(), pos.lng());
                }
                // Also fire pov update so spectators get position + current heading
                if (onPovChange) {
                  const pov = panorama.getPov();
                  onPovChange(pov.heading, pov.pitch, panorama.getZoom());
                }
              });
            }
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

  useEffect(() => {
    if (externalPov && panoramaInstanceRef.current) {
      panoramaInstanceRef.current.setPov({ heading: externalPov.heading, pitch: externalPov.pitch });
      panoramaInstanceRef.current.setZoom(externalPov.zoom);
    }
  }, [externalPov]);

  useEffect(() => {
    if (externalPosition && panoramaInstanceRef.current) {
      panoramaInstanceRef.current.setPosition(externalPosition);
    }
  }, [externalPosition]);

  return (
    <div className="streetview-panorama-container">
      <div ref={panoramaRef} className="streetview-panorama" />
    </div>
  );
};
