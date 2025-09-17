'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Link from '@mui/joy/Link';
import Typography from '@mui/joy/Typography';
import { useDropzone } from 'react-dropzone';
import type { DropzoneOptions } from 'react-dropzone';

export interface FileDropzoneProps extends DropzoneOptions {
  caption?: string;
}

export function FileDropzone({ caption, onDrop }: FileDropzoneProps): React.JSX.Element {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Box
      {...getRootProps()}
      sx={{
        bgcolor: 'var(--joy-palette-background-level1)',
        border: '1px dotted var(--joy-palette-neutral-outlinedBorder)',
        borderRadius: 'var(--joy-radius-md)',
        p: 2,
      }}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <Typography>Drop the files here ...</Typography>
      ) : (
        <div>
          <Typography level="body-sm" textAlign="center">
            Drag & drop files or <Link>browse files</Link>
          </Typography>
          {caption ? (
            <Typography level="body-sm" textAlign="center">
              {caption}
            </Typography>
          ) : null}
        </div>
      )}
    </Box>
  );
}
