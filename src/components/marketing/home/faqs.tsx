'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Container from '@mui/joy/Container';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

import { config } from '@/config';

interface Faq {
  id: string;
  question: string;
  response: string;
}

const faqs = [
  {
    id: 'FAQ-003',
    question: `How many projects can I build with Lotru?`,
    response:
      "The license is per project (domain), but if you intend to develop an unknown number of projects feel free to contact us and we'll find a solution.",
  },
  {
    id: 'FAQ-002',
    question: 'Can I use the template for commercial purposes?',
    response:
      'Absolutely! If you intend to charge users for using your product Extended license is created specifically for this context.',
  },
  {
    id: 'FAQ-001',
    question: 'For what kind of projects is the Standard license intended?',
    response:
      'The Standard license is designed for internal applications in which staff will access the application. An example could be the back-office dashboard of a public-facing e-commerce website in which staff would sign in and manage inventory, customers, etc.',
  },
] satisfies Faq[];

export function Faqs(): React.JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1 }}
    >
      <Container sx={{ py: '100px' }}>
        <Stack spacing={6}>
          <Stack spacing={2}>
            <Typography color="primary" level="body-sm" textAlign="center">
              {config.site.name} FAQs
            </Typography>
            <Typography level="h1" textAlign="center">
              Frequently Asked Questions
            </Typography>
          </Stack>
          <Stack spacing={2} sx={{ maxWidth: 'sm', mx: 'auto', width: '100%' }}>
            {faqs.map(
              (faq, index): React.JSX.Element => (
                <FaqCard key={faq.id} open={index === 0} {...faq} />
              )
            )}
          </Stack>
        </Stack>
      </Container>
    </motion.section>
  );
}

export interface FaqCardProps extends Faq {
  open?: boolean;
}

function FaqCard({ open: forceOpen = false, question, response }: FaqCardProps): React.JSX.Element {
  const [expanded, setExpanded] = React.useState<boolean>(forceOpen);
  const controls = useAnimation();

  React.useEffect((): void => {
    controls.start(expanded ? 'expanded' : 'collapsed').catch((): void => {
      // silent
    });
  }, [controls, expanded]);

  return (
    <AnimatePresence initial={false}>
      <Sheet sx={{ borderRadius: 'var(--joy-radius-md)', gap: 3, p: '16px' }} variant="outlined">
        <motion.header
          initial={false}
          onClick={(): void => {
            setExpanded(!expanded);
          }}
        >
          <Stack direction="row" spacing={2} sx={{ cursor: 'pointer' }}>
            <Box sx={{ flex: '1 1 auto' }}>
              <Typography level="title-lg">{question}</Typography>
            </Box>
            <div>
              <motion.div animate={{ rotate: expanded ? '180deg' : 0 }} transition={{ duration: 0.2 }}>
                <CaretDownIcon fontSize="var(--joy-fontSize-md)" weight="bold" />
              </motion.div>
            </div>
          </Stack>
        </motion.header>
        <motion.section
          animate={controls}
          initial="collapsed"
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          variants={{ collapsed: { opacity: 0, height: 0 }, expanded: { opacity: 1, height: 'auto' } }}
        >
          <Box sx={{ pr: '24px' }}>
            <Typography>{response}</Typography>
          </Box>
        </motion.section>
      </Sheet>
    </AnimatePresence>
  );
}
