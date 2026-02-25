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
  // Keep refs so async init callback always reads the latest values
  const disableControlsRef = useRef<boolean>(!!disableControls);
  const externalPovRef = useRef(externalPov);
  const externalPositionRef = useRef(externalPosition);
  const onPovChangeRef = useRef(onPovChange);
  const onPositionChangeRef = useRef(onPositionChange);

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

            // Apply the CURRENT disableControls value — it may have changed
            // since this async callback started (e.g. new round reset hasGuessed)
            panorama.setOptions({
              zoomControl: !disableControlsRef.current,
              linksControl: !disableControlsRef.current,
              panControl: !disableControlsRef.current,
              clickToGo: !disableControlsRef.current,
              scrollwheel: !disableControlsRef.current,
            });

            // Apply any pending external state that arrived before panorama was ready
            if (externalPovRef.current) {
              panorama.setPov({ heading: externalPovRef.current.heading, pitch: externalPovRef.current.pitch });
              panorama.setZoom(externalPovRef.current.zoom);
            }
            if (externalPositionRef.current) {
              panorama.setPosition(externalPositionRef.current);
            }

            // Always add listeners — use refs so they pick up the latest
            // callback even if props changed while getPanorama was loading
            panorama.addListener('pov_changed', () => {
              if (!onPovChangeRef.current) return;
              const pov = panorama.getPov();
              onPovChangeRef.current(pov.heading, pov.pitch, panorama.getZoom());
            });

            panorama.addListener('position_changed', () => {
              const pos = panorama.getPosition();
              if (!pos) return;
              if (onPositionChangeRef.current) {
                onPositionChangeRef.current(pos.lat(), pos.lng());
              }
              if (onPovChangeRef.current) {
                const pov = panorama.getPov();
                onPovChangeRef.current(pov.heading, pov.pitch, panorama.getZoom());
              }
            });
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

  // Keep callback refs in sync with latest props
  useEffect(() => { onPovChangeRef.current = onPovChange; }, [onPovChange]);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);

  // Reactively update controls when disableControls prop changes
  useEffect(() => {
    disableControlsRef.current = !!disableControls;
    if (!panoramaInstanceRef.current) return;
    panoramaInstanceRef.current.setOptions({
      zoomControl: !disableControls,
      linksControl: !disableControls,
      panControl: !disableControls,
      clickToGo: !disableControls,
      scrollwheel: !disableControls,
    });
  }, [disableControls]);

  useEffect(() => {
    externalPovRef.current = externalPov;
    if (externalPov && panoramaInstanceRef.current) {
      panoramaInstanceRef.current.setPov({ heading: externalPov.heading, pitch: externalPov.pitch });
      panoramaInstanceRef.current.setZoom(externalPov.zoom);
    }
  }, [externalPov]);

  useEffect(() => {
    externalPositionRef.current = externalPosition;
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
