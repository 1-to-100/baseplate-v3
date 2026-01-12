'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import Textarea from '@mui/joy/Textarea';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemContent from '@mui/joy/ListItemContent';
import Divider from '@mui/joy/Divider';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import Tooltip from '@mui/joy/Tooltip';
import Dropdown from '@mui/joy/Dropdown';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import MenuButton from '@mui/joy/MenuButton';
import { Plus as ZoomInIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Minus as ZoomOutIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { ArrowsHorizontal as FitToWidthIcon } from '@phosphor-icons/react/dist/ssr/ArrowsHorizontal';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Download as DownloadIcon } from '@phosphor-icons/react/dist/ssr/Download';
import { Link as LinkIcon } from '@phosphor-icons/react/dist/ssr/Link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/core/toaster';
import { useCapture, useCaptureRequest } from '../../lib/hooks';
import type { WebScreenshotCapture } from '../../lib/types';
import dayjs from 'dayjs';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CaptureViewerProps {
  captureId: string;
}

export function CaptureViewer({ captureId }: CaptureViewerProps): React.JSX.Element {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'preview' | 'html' | 'css' | 'meta'>('preview');
  const [zoom, setZoom] = React.useState(1);
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const { data: capture, isLoading, error } = useCapture(captureId);
  const requestId = capture?.web_screenshot_capture_request_id;
  const { data: request } = useCaptureRequest(requestId);

  // Generate signed URL for the screenshot (valid for 1 hour)
  // According to Supabase docs: https://supabase.com/docs/guides/storage/serving/downloads
  // For private buckets, we need to use createSignedUrl() to generate time-limited URLs
  const isCompleted = request?.status === 'completed';
  const { data: signedUrl, isLoading: isLoadingSignedUrl } = useQuery({
    queryKey: ['screenshot-signed-url', capture?.screenshot_storage_path],
    queryFn: async () => {
      if (!capture?.screenshot_storage_path) return null;

      const supabase = createClient();

      // Extract the storage path from the URL if it's a full URL
      // The path format is: {customer_id}/{filename}
      let storagePath = capture.screenshot_storage_path;

      // If it's a full URL, extract just the path part
      // Format: https://[project].supabase.co/storage/v1/object/public/screenshots/{path}
      // or: https://[project].supabase.co/storage/v1/object/authenticated/screenshots/{path}
      const urlMatch = storagePath.match(/\/screenshots\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        storagePath = urlMatch[1];
      }

      const { data, error } = await supabase.storage
        .from('screenshots')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
      }

      return data?.signedUrl || null;
    },
    enabled: !!capture?.screenshot_storage_path && isCompleted,
    staleTime: 3600000, // Consider fresh for 1 hour (matches URL expiry)
  });

  // Keyboard shortcuts for zoom
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((prev) => Math.max(prev - 0.25, 0.25));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = async (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleDownloadScreenshot = async () => {
    if (!signedUrl) {
      toast.error('Screenshot URL not available');
      return;
    }

    if (!capture) {
      toast.error('Capture data not available');
      return;
    }

    try {
      // Fetch the image
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch screenshot');
      }
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename from page title or use capture ID
      const pageTitle = capture.page_title || 'screenshot';
      const sanitizedTitle = pageTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = dayjs(capture.captured_at).format('YYYY-MM-DD_HH-mm-ss');
      a.download = `${sanitizedTitle}_${timestamp}.png`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Screenshot downloaded');
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      toast.error('Failed to download screenshot');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard');
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)', display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load capture';
    const isNotFound = errorMessage.toLowerCase().includes('not found');

    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Capture Viewer
            </Typography>
            <Typography level='body-md' color='neutral'>
              {isNotFound
                ? 'The requested capture could not be found'
                : 'An error occurred while loading the capture'}
            </Typography>
          </Stack>
          <Alert color='danger' variant='soft' role='alert'>
            <Typography level='title-sm' color='danger' sx={{ mb: 1 }}>
              {isNotFound ? 'Capture Not Found' : 'Error'}
            </Typography>
            <Typography level='body-sm' color='danger'>
              {errorMessage}
            </Typography>
          </Alert>
          <Button variant='outlined' onClick={() => router.push('/source-and-snap/captures')}>
            Back to Captures
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!capture) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Capture Viewer
            </Typography>
            <Typography level='body-md' color='neutral'>
              The requested capture could not be found
            </Typography>
          </Stack>
          <Alert color='danger' variant='soft' role='alert'>
            <Typography level='title-sm' color='danger' sx={{ mb: 1 }}>
              Capture Not Found
            </Typography>
            <Typography level='body-sm' color='danger'>
              The capture you are looking for does not exist or you do not have permission to access
              it.
            </Typography>
          </Alert>
          <Button variant='outlined' onClick={() => router.push('/source-and-snap/captures')}>
            Back to Captures
          </Button>
        </Stack>
      </Box>
    );
  }

  const hasError = request?.status === 'failed';

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
          <div>
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Capture Viewer
            </Typography>
            <Typography level='body-md' color='neutral'>
              Inspect screenshot, view source, and export capture artifacts
            </Typography>
          </div>
          <Stack direction='row' spacing={2}>
            <Button
              variant='outlined'
              startDecorator={<LinkIcon size={16} />}
              onClick={handleCopyLink}
              aria-label='Copy capture link'
            >
              Copy Link
            </Button>
          </Stack>
        </Stack>

        {/* Error Alert */}
        {hasError && request?.error_message && (
          <Alert color='danger' variant='soft' role='alert'>
            <Typography level='title-sm' color='danger' sx={{ mb: 1 }}>
              Capture Failed
            </Typography>
            <Typography level='body-sm'>{request.error_message}</Typography>
          </Alert>
        )}

        {/* Main Content */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          {/* Left: Screenshot Canvas */}
          <Card variant='outlined' sx={{ flex: 1, minWidth: 0 }}>
            <CardContent>
              <Stack spacing={2}>
                {/* Zoom Controls */}
                <Stack
                  direction='row'
                  spacing={1}
                  justifyContent='space-between'
                  alignItems='center'
                >
                  <Typography level='title-sm'>Preview</Typography>
                  <Stack direction='row' spacing={1}>
                    <Tooltip title='Zoom In (+)'>
                      <IconButton
                        size='sm'
                        variant='outlined'
                        onClick={() => setZoom((prev) => Math.min(prev + 0.25, 3))}
                        aria-label='Zoom in'
                      >
                        <ZoomInIcon size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Zoom Out (-)'>
                      <IconButton
                        size='sm'
                        variant='outlined'
                        onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.25))}
                        aria-label='Zoom out'
                      >
                        <ZoomOutIcon size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Fit to Width'>
                      <IconButton
                        size='sm'
                        variant='outlined'
                        onClick={() => setZoom(1)}
                        aria-label='Fit to width'
                      >
                        <FitToWidthIcon size={16} />
                      </IconButton>
                    </Tooltip>
                    <Typography level='body-sm' sx={{ alignSelf: 'center', px: 1 }}>
                      {Math.round(zoom * 100)}%
                    </Typography>
                  </Stack>
                </Stack>

                {/* Screenshot */}
                {isCompleted && capture.screenshot_storage_path ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 'sm',
                      overflow: 'auto',
                      bgcolor: 'neutral.50',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 400,
                    }}
                    role='img'
                    aria-label={`Screenshot of ${capture.page_title || 'captured page'}`}
                  >
                    {isLoadingSignedUrl ? (
                      <CircularProgress />
                    ) : signedUrl ? (
                      <img
                        src={signedUrl}
                        alt={capture.page_title || 'Screenshot'}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          transform: `scale(${zoom})`,
                          transformOrigin: 'top left',
                        }}
                        onError={(e) => {
                          console.error('Error loading screenshot:', e);
                          toast.error('Failed to load screenshot');
                        }}
                      />
                    ) : (
                      <Typography level='body-md' color='neutral'>
                        Failed to generate screenshot URL
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 'sm',
                      p: 4,
                      textAlign: 'center',
                      bgcolor: 'neutral.50',
                    }}
                  >
                    <Typography level='body-md' color='neutral'>
                      {hasError ? 'Screenshot not available' : 'Screenshot processing...'}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Right: Metadata Panel */}
          <Card variant='outlined' sx={{ width: { xs: '100%', lg: 400 } }}>
            <CardContent>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value as typeof activeTab)}
              >
                <TabList>
                  <Tab value='preview'>Preview</Tab>
                  {capture.raw_html && <Tab value='html'>HTML</Tab>}
                  {capture.raw_css && <Tab value='css'>CSS</Tab>}
                  <Tab value='meta'>Meta</Tab>
                </TabList>

                <TabPanel value='preview'>
                  <Stack spacing={2}>
                    <Stack direction='row' spacing={1} justifyContent='flex-end'>
                      {signedUrl && (
                        <Tooltip title='Download Screenshot'>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            onClick={handleDownloadScreenshot}
                            disabled={isLoadingSignedUrl}
                            aria-label='Download screenshot'
                          >
                            <DownloadIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography level='body-xs' color='neutral'>
                          Page Title
                        </Typography>
                        <Typography level='body-sm'>{capture.page_title || 'N/A'}</Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography level='body-xs' color='neutral'>
                          Device Profile
                        </Typography>
                        <Typography level='body-sm'>
                          {capture.device_profile?.display_name || 'Default'}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography level='body-xs' color='neutral'>
                          Captured At
                        </Typography>
                        <Typography level='body-sm'>
                          {dayjs(capture.captured_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Typography>
                      </Box>
                      {capture.screenshot_width && capture.screenshot_height && (
                        <>
                          <Divider />
                          <Box>
                            <Typography level='body-xs' color='neutral'>
                              Dimensions
                            </Typography>
                            <Typography level='body-sm'>
                              {capture.screenshot_width} × {capture.screenshot_height}px
                            </Typography>
                          </Box>
                        </>
                      )}
                      {capture.screenshot_size_bytes && (
                        <>
                          <Divider />
                          <Box>
                            <Typography level='body-xs' color='neutral'>
                              Screenshot Size
                            </Typography>
                            <Typography level='body-sm'>
                              {(capture.screenshot_size_bytes / 1024).toFixed(2)} KB
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </TabPanel>

                {capture.raw_html && (
                  <TabPanel value='html'>
                    <Stack spacing={2}>
                      <Stack direction='row' spacing={1} justifyContent='flex-end'>
                        <Tooltip title='Copy HTML'>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            onClick={() => handleCopy(capture.raw_html!, 'HTML')}
                            aria-label='Copy HTML'
                          >
                            <CopyIcon size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Download HTML'>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            onClick={() =>
                              handleDownload(
                                capture.raw_html!,
                                `capture-${captureId}.html`,
                                'text/html'
                              )
                            }
                            aria-label='Download HTML'
                          >
                            <DownloadIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Textarea
                        value={capture.raw_html}
                        readOnly
                        minRows={10}
                        maxRows={20}
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                        aria-label='Raw HTML'
                      />
                    </Stack>
                  </TabPanel>
                )}

                {capture.raw_css && (
                  <TabPanel value='css'>
                    <Stack spacing={2}>
                      <Stack direction='row' spacing={1} justifyContent='flex-end'>
                        <Tooltip title='Copy CSS'>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            onClick={() => handleCopy(capture.raw_css!, 'CSS')}
                            aria-label='Copy CSS'
                          >
                            <CopyIcon size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Download CSS'>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            onClick={() =>
                              handleDownload(
                                capture.raw_css!,
                                `capture-${captureId}.css`,
                                'text/css'
                              )
                            }
                            aria-label='Download CSS'
                          >
                            <DownloadIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Textarea
                        value={capture.raw_css}
                        readOnly
                        minRows={10}
                        maxRows={20}
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                        aria-label='Raw CSS'
                      />
                    </Stack>
                  </TabPanel>
                )}

                <TabPanel value='meta'>
                  <Stack spacing={2}>
                    <Typography level='title-sm'>Capture Metadata</Typography>
                    {request && (
                      <List>
                        <ListItem>
                          <ListItemContent>
                            <Typography level='body-xs' color='neutral'>
                              Requested URL
                            </Typography>
                            <Typography level='body-sm'>{request.requested_url}</Typography>
                          </ListItemContent>
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemContent>
                            <Typography level='body-xs' color='neutral'>
                              Status
                            </Typography>
                            <Typography level='body-sm'>{request.status}</Typography>
                          </ListItemContent>
                        </ListItem>
                      </List>
                    )}
                    {capture.capture_meta && Object.keys(capture.capture_meta).length > 0 && (
                      <Textarea
                        value={JSON.stringify(capture.capture_meta, null, 2)}
                        readOnly
                        minRows={5}
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                        aria-label='Capture metadata JSON'
                      />
                    )}
                  </Stack>
                </TabPanel>
              </Tabs>
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </Box>
  );
}
