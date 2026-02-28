'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Input from '@mui/joy/Input';
import IconButton from '@mui/joy/IconButton';
import CircularProgress from '@mui/joy/CircularProgress';
import { RocketLaunch } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { PaperPlaneRight } from '@phosphor-icons/react/dist/ssr/PaperPlaneRight';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/components/core/toaster';
import { askAiSegment } from '../../lib/api/segment-lists';
import type { AiGeneratedSegment } from '../../lib/types/list';
import { useCallback } from 'react';

interface AskAiSegmentProps {
  onAiSegmentGenerated?: (segment: AiGeneratedSegment) => void;
  disabled?: boolean;
}

export function AskAiSegment({
  onAiSegmentGenerated,
  disabled = false,
}: AskAiSegmentProps): React.JSX.Element {
  const [inputValue, setInputValue] = React.useState('');

  const askAiSegmentMutation = useMutation({
    mutationFn: askAiSegment,
    onSuccess: (segment) => {
      setInputValue('');
      toast.success('AI generated segment filters successfully!');
      onAiSegmentGenerated?.(segment);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate segment. Please try again.';

      toast.error(errorMessage, { duration: 7000 });
    },
  });

  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    askAiSegmentMutation.mutate(trimmedValue);
  }, [inputValue, askAiSegmentMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !askAiSegmentMutation.isPending) {
        handleSend();
      }
    },
    [askAiSegmentMutation]
  );

  const isLoading = askAiSegmentMutation.isPending;
  const isDisabled = disabled || isLoading;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
      }}
    >
      <Input
        placeholder='Ask AI to build a segment...'
        startDecorator={<RocketLaunch size={16} />}
        sx={{ flexGrow: 1 }}
        value={inputValue}
        disabled={isDisabled}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {isLoading ? (
        <CircularProgress size='sm' />
      ) : (
        <IconButton
          variant='outlined'
          color='primary'
          onClick={handleSend}
          disabled={!inputValue.trim() || isDisabled}
        >
          <PaperPlaneRight size={16} />
        </IconButton>
      )}
    </Box>
  );
}
