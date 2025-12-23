'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import Chip from '@mui/joy/Chip';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import { X } from '@phosphor-icons/react/dist/ssr';
import type { ContentEvaluationResponse } from '../../api/content-evaluations';

const severityColors: Record<number, 'primary' | 'warning' | 'danger'> = {
  1: 'primary',
  2: 'warning',
  3: 'danger',
};

const severityLabels: Record<number, string> = {
  1: 'Info',
  2: 'Warning',
  3: 'Blocker',
};

interface EvaluationResultsModalProps {
  open: boolean;
  onClose: () => void;
  evaluation: ContentEvaluationResponse | null;
  onApplyAllMinorFixes?: () => void;
  onOpenFullReview?: () => void;
}

export function EvaluationResultsModal({
  open,
  onClose,
  evaluation,
  onApplyAllMinorFixes,
  onOpenFullReview,
}: EvaluationResultsModalProps): React.JSX.Element {
  const ruleHits = evaluation?.rule_hits || [];
  const minorFixes = ruleHits.filter((hit) => (typeof hit.severity_level === 'number' ? hit.severity_level : 0) === 1);

  const severityCounts = {
    info: ruleHits.filter((h) => (typeof h.severity_level === 'number' ? h.severity_level : 0) === 1).length,
    warning: ruleHits.filter((h) => (typeof h.severity_level === 'number' ? h.severity_level : 0) === 2).length,
    blocker: ruleHits.filter((h) => (typeof h.severity_level === 'number' ? h.severity_level : 0) === 3).length,
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="evaluation-results-title"
        sx={{ minWidth: 700, maxWidth: 900 }}
      >
        <ModalClose />
        <Typography id="evaluation-results-title" level="h2">
          Evaluation Results
        </Typography>
        <Typography level="body-md" color="neutral" sx={{ mt: 1 }}>
          Summary of rule and vocabulary hits for this draft
        </Typography>

        {evaluation && (
          <Stack spacing={3} sx={{ mt: 3 }}>
            {/* Summary Chips */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                color="primary"
                variant="soft"
                role="button"
                aria-pressed="false"
              >
                Info: {severityCounts.info}
              </Chip>
              <Chip
                color="warning"
                variant="soft"
                role="button"
                aria-pressed="false"
              >
                Warning: {severityCounts.warning}
              </Chip>
              <Chip
                color="danger"
                variant="soft"
                role="button"
                aria-pressed="false"
              >
                Blocker: {severityCounts.blocker}
              </Chip>
              <Chip variant="soft">
                Total: {ruleHits.length}
              </Chip>
            </Stack>

            {/* Hits Table */}
            {ruleHits.length > 0 ? (
              <Box sx={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                <Table aria-label="Evaluation hits table" stickyHeader>
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Matched Text</th>
                      <th>Rule/Vocab</th>
                      <th>Suggested Replacement</th>
                      <th style={{ width: 100 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleHits.map((hit) => (
                      <tr key={hit.rule_hit_id}>
                        <td>
                          <Chip
                            color={severityColors[(typeof hit.severity_level === 'number' ? hit.severity_level : 1) as keyof typeof severityColors]}
                            size="sm"
                            variant="soft"
                          >
                            {severityLabels[(typeof hit.severity_level === 'number' ? hit.severity_level : 1) as keyof typeof severityLabels]}
                          </Chip>
                        </td>
                        <td>
                          <Typography level="body-sm" sx={{ maxWidth: 200 }}>
                            {typeof hit.matched_text === 'string' ? hit.matched_text : '—'}
                          </Typography>
                        </td>
                        <td>
                          <Typography level="body-sm">
                            {hit.vocabulary_entry_id ? 'Vocabulary' : 'Rule'}
                          </Typography>
                        </td>
                        <td>
                          <Typography level="body-sm" sx={{ maxWidth: 200 }}>
                            {typeof hit.suggested_replacement === 'string' ? hit.suggested_replacement : '—'}
                          </Typography>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outlined"
                            aria-label={`Apply fix for ${typeof hit.matched_text === 'string' ? hit.matched_text : 'rule violation'}`}
                          >
                            Apply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography level="body-md" color="success">
                  No issues found. Content is compliant!
                </Typography>
              </Box>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Stack direction="row" spacing={2}>
                {minorFixes.length > 0 && onApplyAllMinorFixes && (
                  <Button
                    variant="outlined"
                    onClick={onApplyAllMinorFixes}
                    aria-label="Apply all minor fixes"
                  >
                    Apply All Minor Fixes ({minorFixes.length})
                  </Button>
                )}
                {onOpenFullReview && (
                  <Button
                    variant="outlined"
                    onClick={onOpenFullReview}
                    aria-label="Open full review"
                  >
                    Open Full Review
                  </Button>
                )}
              </Stack>
              <Button onClick={onClose} aria-label="Close evaluation results">
                Close
              </Button>
            </Stack>
          </Stack>
        )}
      </ModalDialog>
    </Modal>
  );
}

