'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import { useColorScheme } from '@mui/joy/styles';
import Typography from '@mui/joy/Typography';
import { motion } from 'framer-motion';

import { config } from '@/config';
import {Marker, ViewState} from 'react-map-gl/mapbox';
import {Map, MapRef} from 'react-map-gl/mapbox-legacy';
import {EasingOptions} from 'mapbox-gl';

// Map default view state
const VIEW_STATE: Pick<ViewState, 'latitude' | 'longitude' | 'zoom'> = {
  latitude: 40.707313,
  longitude: -74.012083,
  zoom: 13,
};

export interface OrderLocationProps {
  latitude?: ViewState['latitude'];
  longitude?: ViewState['longitude'];
}

export function OrderLocation(props: OrderLocationProps): React.JSX.Element {
  const { latitude, longitude } = props;
  const mapRef = React.useRef<MapRef | null>(null);
  const mapStyle = useMapStyle();

  useRecenter({ latitude, longitude, map: mapRef.current });

  const [viewState] = React.useState<Partial<ViewState>>(() => {
    if (!latitude || !longitude) {
      return VIEW_STATE;
    }

    return { ...VIEW_STATE, latitude, longitude };
  });

  if (!config.mapbox.apiKey) {
    return (
      <Stack
        spacing={1}
        sx={{ alignItems: 'center', flexDirection: 'column', height: '100%', justifyContent: 'center' }}
      >
        <Typography level="title-lg" sx={{ mb: 1 }}>
          Map cannot be loaded
        </Typography>
        <Typography>Mapbox API Key is not configured.</Typography>
      </Stack>
    );
  }

  const hasMarker = Boolean(longitude && latitude);

  return (
    <Map
      attributionControl={false}
      initialViewState={viewState}
      mapStyle={mapStyle}
      mapboxAccessToken={config.mapbox.apiKey}
      maxZoom={20}
      minZoom={11}
      ref={mapRef}
    >
      {hasMarker ? (
        <Marker latitude={latitude!} longitude={longitude!}>
          <Box sx={{ position: 'relative', height: '24px', width: '24px' }}>
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0 }}
              transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
            >
              <Box
                sx={{
                  bgcolor: 'var(--joy-palette-primary-softBg)',
                  borderRadius: '50%',
                  height: '24px',
                  width: '24px',
                }}
              />
            </motion.div>
            <Box
              sx={{
                bgcolor: 'var(--joy-palette-primary-solidBg)',
                borderRadius: '50%',
                height: '10px',
                left: '50%',
                position: 'absolute',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '10px',
                zIndex: 1,
              }}
            />
          </Box>
        </Marker>
      ) : null}
    </Map>
  );
}

function useMapStyle(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v9' : 'mapbox://styles/mapbox/light-v9';
}

function useRecenter({
  latitude,
  longitude,
  map,
}: {
  latitude?: ViewState['latitude'];
  longitude?: ViewState['longitude'];
  map?: MapRef | null;
}): void {
  React.useEffect((): void => {
    if (!map) {
      return;
    }

    let easingOptions: EasingOptions;

    if (!latitude || !longitude) {
      easingOptions = { center: [VIEW_STATE.longitude, VIEW_STATE.latitude] };
    } else {
      easingOptions = { center: [longitude, latitude] };
    }

    map.flyTo(easingOptions);
  }, [longitude, latitude, map]);
}
