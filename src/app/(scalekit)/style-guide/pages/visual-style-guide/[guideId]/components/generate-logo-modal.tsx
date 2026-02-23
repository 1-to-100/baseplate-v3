'use client';

import { ImageWithFallback } from '@/components/core/image-with-fallback';
import { toast } from '@/components/core/toaster';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CircularProgress from '@mui/joy/CircularProgress';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Grid from '@mui/joy/Grid';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import { MagicWand } from '@phosphor-icons/react';
import * as React from 'react';

export type GeneratedLogo = {
  id: string;
  url: string;
  revised_prompt?: string;
};

type GenerateLogoModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (selectedLogo: GeneratedLogo, allLogos: GeneratedLogo[]) => Promise<void>;
  onGenerate: (prompt: string) => Promise<GeneratedLogo[]>;
  isGenerating?: boolean;
  isSaving?: boolean;
  initialPrompt?: string;
};

export function GenerateLogoModal({
  open,
  onClose,
  onSave,
  onGenerate,
  isGenerating = false,
  isSaving = false,
  initialPrompt = '',
}: GenerateLogoModalProps): React.JSX.Element {
  const [prompt, setPrompt] = React.useState(initialPrompt);
  const [generatedLogos, setGeneratedLogos] = React.useState<GeneratedLogo[]>([]);
  const [selectedLogoId, setSelectedLogoId] = React.useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = React.useState(false);

  const prevOpenRef = React.useRef(false);
  // Sync prompt from initialPrompt only when the modal first opens, so async
  // initialPrompt updates (e.g. from useCustomerInfo) don't overwrite in-progress edits.
  React.useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened) {
      setPrompt(initialPrompt);
    }
  }, [open, initialPrompt]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your logo');
      return;
    }

    try {
      const logos = await onGenerate(prompt);
      setGeneratedLogos(logos);
      setSelectedLogoId(null);
      setHasGenerated(true);
    } catch (error) {
      console.error('Logo generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate logos');
    }
  };

  const handleSave = async () => {
    if (!selectedLogoId) {
      toast.error('Please select a logo to save');
      return;
    }

    const selectedLogo = generatedLogos.find((logo) => logo.id === selectedLogoId);
    if (!selectedLogo) {
      toast.error('Selected logo not found');
      return;
    }

    try {
      await onSave(selectedLogo, generatedLogos);
      handleClose();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save logo');
    }
  };

  const handleClose = () => {
    setPrompt(initialPrompt);
    setGeneratedLogos([]);
    setSelectedLogoId(null);
    setHasGenerated(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        role='dialog'
        aria-modal='true'
        aria-labelledby='generate-logo-modal-title'
        sx={{
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <ModalClose disabled={isGenerating || isSaving} />

        <Typography id='generate-logo-modal-title' level='title-lg' component='h2'>
          Generate Logo
        </Typography>

        <Typography level='body-md' color='neutral' sx={{ mt: 1 }}>
          Tell us how you imagine your logo! Describe the style, colors, icons, or vibe you want,
          and our AI will create it for you.
        </Typography>

        <Stack spacing={3} sx={{ mt: 3 }}>
          <FormControl>
            <FormLabel>Enter text</FormLabel>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Enter text'
              minRows={3}
              maxRows={5}
              disabled={isGenerating}
              aria-label='Logo description'
            />
          </FormControl>

          {/* Generated Logos Grid */}
          {(generatedLogos.length > 0 || isGenerating) && (
            <Grid container spacing={2}>
              {isGenerating
                ? // Loading placeholders
                  Array.from({ length: 3 }).map((_, index) => (
                    <Grid key={`loading-${index}`} xs={4}>
                      <Card
                        variant='outlined'
                        sx={{
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'background.level2',
                        }}
                      >
                        <CircularProgress size='sm' />
                      </Card>
                    </Grid>
                  ))
                : // Generated logos
                  generatedLogos.map((logo) => (
                    <Grid key={logo.id} xs={4}>
                      <Card
                        variant='outlined'
                        onClick={() => setSelectedLogoId(logo.id)}
                        sx={{
                          aspectRatio: '1',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor:
                            selectedLogoId === logo.id ? 'primary.500' : 'neutral.outlinedBorder',
                          transition: 'border-color 0.15s ease, transform 0.15s ease',
                          '&:hover': {
                            borderColor: selectedLogoId === logo.id ? 'primary.500' : 'primary.300',
                            transform: 'scale(1.02)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            p: 1,
                          }}
                        >
                          <ImageWithFallback
                            src={logo.url}
                            alt='Generated logo option'
                            fill
                            style={{ objectFit: 'contain' }}
                            unoptimized
                          />
                        </Box>
                      </Card>
                    </Grid>
                  ))}
            </Grid>
          )}

          {/* Action Buttons */}
          <Stack
            direction='row'
            spacing={2}
            sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
          >
            {hasGenerated && (
              <Button
                variant='plain'
                color='primary'
                startDecorator={<MagicWand />}
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={isSaving}
              >
                Regenerate
              </Button>
            )}
            <Button variant='outlined' onClick={handleClose} disabled={isGenerating || isSaving}>
              Cancel
            </Button>
            {hasGenerated ? (
              <Button
                variant='solid'
                color='primary'
                onClick={handleSave}
                loading={isSaving}
                disabled={!selectedLogoId || isGenerating}
              >
                Save
              </Button>
            ) : (
              <Button
                variant='solid'
                color='primary'
                startDecorator={<MagicWand />}
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={!prompt.trim()}
              >
                Generate
              </Button>
            )}
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
