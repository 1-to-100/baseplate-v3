'use client';

import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import { ImageBroken } from '@phosphor-icons/react';
import Image, { type ImageProps } from 'next/image';
import * as React from 'react';

type FallbackProps = {
  icon?: React.ReactNode;
  message?: string;
};

type ImageWithFallbackProps = Omit<ImageProps, 'onError'> & {
  fallback?: React.ReactNode;
  fallbackProps?: FallbackProps;
};

/**
 * A wrapper around Next.js Image component that gracefully handles image load failures.
 * Shows a customizable fallback UI when the image fails to load.
 *
 * @example
 * // Basic usage
 * <ImageWithFallback src={imageUrl} alt="Description" width={200} height={200} />
 *
 * @example
 * // With custom fallback message
 * <ImageWithFallback
 *   src={imageUrl}
 *   alt="Description"
 *   fill
 *   fallbackProps={{ message: "Image unavailable" }}
 * />
 *
 * @example
 * // With completely custom fallback UI
 * <ImageWithFallback
 *   src={imageUrl}
 *   alt="Description"
 *   fill
 *   fallback={<CustomFallbackComponent />}
 * />
 */
export function ImageWithFallback({
  fallback,
  fallbackProps,
  ...imageProps
}: ImageWithFallbackProps): React.JSX.Element {
  const [hasError, setHasError] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setHasError(false);
  }, [imageProps.src]);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          gap: 1,
          color: 'neutral.500',
        }}
      >
        {fallbackProps?.icon ?? <ImageBroken size={32} />}
        <Typography level='body-xs' color='neutral'>
          {fallbackProps?.message ?? 'Failed to load'}
        </Typography>
      </Box>
    );
  }

  return <Image {...imageProps} onError={handleError} />;
}
