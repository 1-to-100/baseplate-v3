'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { paths } from '@/paths';

export default function EditListPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const listId = params?.listId as string | undefined;

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Button
        variant='outlined'
        startDecorator={<ArrowLeftIcon size={20} />}
        onClick={() =>
          router.push(
            listId ? paths.strategyForge.lists.details(listId) : paths.strategyForge.lists.list
          )
        }
        sx={{ mb: 2 }}
      >
        Back to list
      </Button>
      <Typography level='h4'>Edit list</Typography>
      <Typography level='body-md' sx={{ mt: 1, color: 'text.secondary' }}>
        List editing will be available here.
      </Typography>
    </Box>
  );
}
