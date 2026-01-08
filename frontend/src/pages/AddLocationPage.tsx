import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { MistbornModal } from '../components/ui/MistbornModal';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import './AddLocationPage.css';

declare global {
  interface Window {
    google: any;
  }
}

export const AddLocationPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const mapRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const panoramaInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState('');
  const [autoRegion, setAutoRegion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streetViewAvailable, setStreetViewAvailable] = useState(false);
  const [guideCollapsed, setGuideCollapsed] = useState(true);

  // Toast and Modal state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2000);
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    // Wait for Google Maps API to load
    if (window.google?.maps) {
      console.log('Google Maps already loaded');
      initializeMap();
    } else {
      console.log('Google Maps not loaded yet, waiting...');
      const checkGoogleMaps = setInterval(() => {
        if (window.google?.maps) {
          console.log('Google Maps API loaded!');
          clearInterval(checkGoogleMaps);
          initializeMap();
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, [user, navigate]);

  const initializeMap = () => {
    if (!mapRef.current || !panoramaRef.current || !window.google?.maps) {
      console.log('Waiting for Google Maps API or refs...');
      return;
    }

    console.log('Initializing Google Maps...');

    // Initialize map
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapTypeId: 'roadmap',
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    mapInstanceRef.current = map;

    // Initialize panorama
    const panorama = new window.google.maps.StreetViewPanorama(panoramaRef.current, {
      position: { lat: 0, lng: 0 },
      visible: false,
      addressControl: false,
      showRoadLabels: false,
      zoomControl: true,
      fullscreenControl: true,
      enableCloseButton: false,
      linksControl: true,
      panControl: true,
      motionTracking: false,
      motionTrackingControl: false,
    });

    panoramaInstanceRef.current = panorama;

    // Add click listener to map
    map.addListener('click', async (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      await handleLocationSelect(lat, lng);
    });

    console.log('Google Maps initialized successfully');
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });

    // Update marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#d4a574',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    // Center map on location
    mapInstanceRef.current.setCenter({ lat, lng });
    mapInstanceRef.current.setZoom(12);

    // Check Street View availability
    const streetViewService = new window.google.maps.StreetViewService();
    streetViewService.getPanorama(
      {
        location: { lat, lng },
        radius: 50,
        source: window.google.maps.StreetViewSource.OUTDOOR,
      },
      (data: any, status: any) => {
        console.log('Street View status:', status);
        if (status === window.google.maps.StreetViewStatus.OK) {
          console.log('Street View available at this location');
          setStreetViewAvailable(true);

          // Clear any error message
          if (panoramaRef.current) {
            panoramaRef.current.innerHTML = '';
          }

          // Update panorama with found location
          panoramaInstanceRef.current.setPosition(data.location.latLng);
          panoramaInstanceRef.current.setPov({
            heading: 0,
            pitch: 0,
          });
          panoramaInstanceRef.current.setZoom(1);
          panoramaInstanceRef.current.setVisible(true);
        } else {
          console.log('No Street View available at this location');
          setStreetViewAvailable(false);
          panoramaInstanceRef.current.setVisible(false);

          // Show error message in panorama div
          if (panoramaRef.current) {
            panoramaRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff6b6b;font-size:18px;text-align:center;padding:2rem;">No Street View available at this location. Try clicking a different spot on the map.</div>';
          }
        }
      }
    );

    // Get region from reverse geocoding
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const addressComponents = results[0].address_components;

        // Try to find continent/region
        let detectedRegion = '';

        for (const component of addressComponents) {
          if (component.types.includes('country')) {
            const country = component.long_name;
            detectedRegion = getRegionFromCountry(country);
            break;
          }
        }

        if (detectedRegion) {
          setAutoRegion(detectedRegion);
          setRegion(detectedRegion);
        }
      }
    });
  };

  const getRegionFromCountry = (country: string): string => {
    // European countries
    const europe = [
      'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Netherlands',
      'Belgium', 'Switzerland', 'Austria', 'Greece', 'Poland', 'Czech Republic', 'Hungary',
      'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Croatia', 'Serbia', 'Romania',
      'Bulgaria', 'Slovakia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Albania',
      'Bosnia and Herzegovina', 'Montenegro', 'North Macedonia', 'Iceland', 'Luxembourg',
      'Malta', 'Cyprus', 'Ukraine', 'Belarus', 'Moldova', 'Russia'
    ];

    // Asian countries
    const asia = [
      'China', 'Japan', 'India', 'Thailand', 'Vietnam', 'Malaysia', 'Singapore', 'Indonesia',
      'Philippines', 'South Korea', 'North Korea', 'Taiwan', 'Hong Kong', 'Mongolia', 'Kazakhstan',
      'Uzbekistan', 'Pakistan', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Myanmar', 'Cambodia',
      'Laos', 'Brunei', 'Bhutan', 'Maldives', 'Afghanistan', 'Turkmenistan', 'Kyrgyzstan',
      'Tajikistan', 'Armenia', 'Georgia', 'Azerbaijan'
    ];

    // African countries
    const africa = [
      'South Africa', 'Egypt', 'Morocco', 'Kenya', 'Nigeria', 'Ghana', 'Ethiopia', 'Tanzania',
      'Uganda', 'Algeria', 'Tunisia', 'Libya', 'Senegal', 'Botswana', 'Namibia', 'Zimbabwe',
      'Rwanda', 'Madagascar', 'Mauritius', 'Seychelles', 'Mozambique', 'Angola', 'Zambia',
      'Malawi', 'Sudan', 'South Sudan', 'Somalia', 'Djibouti', 'Eritrea', 'Cameroon', 'Ivory Coast',
      'Burkina Faso', 'Mali', 'Niger', 'Chad', 'Central African Republic', 'Democratic Republic of the Congo',
      'Republic of the Congo', 'Gabon', 'Equatorial Guinea'
    ];

    // American countries
    const northAmerica = [
      'United States', 'Canada', 'Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador',
      'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Jamaica', 'Haiti', 'Dominican Republic',
      'Bahamas', 'Trinidad and Tobago', 'Barbados'
    ];

    const southAmerica = [
      'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Venezuela', 'Ecuador', 'Bolivia',
      'Paraguay', 'Uruguay', 'Guyana', 'Suriname', 'French Guiana'
    ];

    // Oceania countries
    const oceania = [
      'Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu',
      'Samoa', 'Tonga', 'Palau', 'Micronesia', 'Marshall Islands', 'Kiribati', 'Tuvalu', 'Nauru'
    ];

    if (europe.includes(country)) return 'Europe';
    if (asia.includes(country)) return 'Asia';
    if (africa.includes(country)) return 'Africa';
    if (northAmerica.includes(country)) return 'North America';
    if (southAmerica.includes(country)) return 'South America';
    if (oceania.includes(country)) return 'Oceania';

    return 'Unknown';
  };

  const handleAddLocation = async () => {
    if (!selectedLocation) {
      showToast('✗ Please select a location on the map');
      return;
    }

    if (!streetViewAvailable) {
      showToast('✗ Street View is not available at this location');
      return;
    }

    if (!region) {
      showToast('✗ Please enter a region');
      return;
    }

    setIsLoading(true);

    try {
      await apiService.addLocation(selectedLocation.lat, selectedLocation.lng, region);
      showToast('✓ Location added successfully!');

      // Reset form
      setSelectedLocation(null);
      setRegion('');
      setAutoRegion('');
      setStreetViewAvailable(false);

      // Clear marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      // Hide panorama
      if (panoramaInstanceRef.current) {
        panoramaInstanceRef.current.setVisible(false);
      }

      // Reset map view
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat: 20, lng: 0 });
        mapInstanceRef.current.setZoom(2);
      }
    } catch (err: any) {
      showToast('✗ Failed to add location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-location-page">
      <FogOverlay />
      <AshParticles />

      <div className="add-location-container">
        <MistbornCard className="add-location-card">
          <div className="add-location-header">
            <h1 className="add-location-title">📍 Add Location</h1>
            <div className="add-location-actions">
              <MistbornButton onClick={() => navigate('/admin')}>
                Back to Admin
              </MistbornButton>
            </div>
          </div>

          <div className="add-location-content">
            {/* Quick Guide */}
            <div className="add-location-guide">
              <div
                className="guide-header"
                onClick={() => setGuideCollapsed(!guideCollapsed)}
              >
                <h3>📖 Quick Guide</h3>
                <span className="guide-toggle">{guideCollapsed ? '▼' : '▲'}</span>
              </div>
              {!guideCollapsed && (
                <ol className="guide-steps">
                  <li>
                    <span className="step-number">1</span>
                    <div className="step-content">
                      <strong>Выбрать координаты</strong>
                      <p>Кликните на карту в нужном месте</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-number">2</span>
                    <div className="step-content">
                      <strong>Проверить панораму</strong>
                      <p>Убедитесь, что Street View доступен в радиусе ~50м и панорама не обрывается сразу</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-number">3</span>
                    <div className="step-content">
                      <strong>Выбрать регион</strong>
                      <p>Регион определяется автоматически, но можно изменить из списка</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-number">4</span>
                    <div className="step-content">
                      <strong>Отправить локацию</strong>
                      <p>Нажмите "Add Location" для сохранения</p>
                    </div>
                  </li>
                </ol>
              )}
            </div>

            {/* Map and Panorama */}
            <div className="add-location-views">
              <div className="add-location-map-container">
                <h3>Map</h3>
                <div ref={mapRef} className="add-location-map" />
              </div>

              <div className="add-location-panorama-container">
                <h3>Street View</h3>
                <div ref={panoramaRef} className="add-location-panorama" />
                {!streetViewAvailable && selectedLocation && (
                  <div className="panorama-overlay">
                    <p>Street View not available at this location</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Info */}
            {selectedLocation && (
              <div className="add-location-info">
                <div className="location-info-grid">
                  <div className="info-item">
                    <span className="info-label">Latitude:</span>
                    <span className="info-value">{selectedLocation.lat.toFixed(6)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Longitude:</span>
                    <span className="info-value">{selectedLocation.lng.toFixed(6)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Street View:</span>
                    <span className={`info-value ${streetViewAvailable ? 'available' : 'unavailable'}`}>
                      {streetViewAvailable ? '✓ Available' : '✗ Not Available'}
                    </span>
                  </div>
                  {autoRegion && (
                    <div className="info-item">
                      <span className="info-label">Detected Region:</span>
                      <span className="info-value">{autoRegion}</span>
                    </div>
                  )}
                </div>

                <div className="location-form">
                  <div className="region-select-wrapper">
                    <label className="region-select-label">Region</label>
                    <select
                      className="region-select"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      <option value="">Select a region...</option>
                      <option value="Europe">Europe</option>
                      <option value="Asia">Asia</option>
                      <option value="Africa">Africa</option>
                      <option value="North America">North America</option>
                      <option value="South America">South America</option>
                      <option value="Oceania">Oceania</option>
                      <option value="Antarctica">Antarctica</option>
                    </select>
                  </div>

                  <MistbornButton
                    fullWidth
                    onClick={handleAddLocation}
                    disabled={isLoading || !streetViewAvailable}
                  >
                    {isLoading ? 'Adding...' : 'Add Location'}
                  </MistbornButton>
                </div>
              </div>
            )}
          </div>
        </MistbornCard>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="add-location-toast">
          {toast.message}
        </div>
      )}

      {/* Modal */}
      <MistbornModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};
