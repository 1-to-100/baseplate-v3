'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CaptureViewer } from '../../ui/screens';

export default function CaptureDetailPage(): React.JSX.Element {
  const params = useParams();
  const captureId = params.id as string;

  return <CaptureViewer captureId={captureId} />;
}
