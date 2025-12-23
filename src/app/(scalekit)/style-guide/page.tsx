"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/joy";
import Grid from "@mui/joy/Grid";
import NextLink from "next/link";
import {
  BookOpen as BookOpenIcon,
  Palette as PaletteIcon,
  FileText as FileTextIcon,
  MagnifyingGlass as MagnifyingGlassIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle as CheckCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { IconWeight } from "@phosphor-icons/react/dist/lib/types";

interface NavigationCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: IconWeight }>;
}

const navigationCards: NavigationCard[] = [
  {
    title: "Written Style Guide",
    description: "Create and manage your written style guide with tone, voice, and messaging guidelines",
    href: "/style-guide/pages/written-style-guide",
    icon: BookOpenIcon,
  },
  {
    title: "Visual Style Guide",
    description: "Create and manage visual style guides with colors, typography, logos, and imagery",
    href: "/style-guide/pages/visual-style-guide/create",
    icon: PaletteIcon,
  },
  {
    title: "Vocabulary",
    description: "Manage approved vocabulary, terms, and language preferences",
    href: "/style-guide/pages/vocabulary",
    icon: FileTextIcon,
  },
  {
    title: "Framing Concepts",
    description: "Define key framing concepts and messaging frameworks",
    href: "/style-guide/pages/framing-concepts",
    icon: LightbulbIcon,
  },
  {
    title: "Compliance Rules",
    description: "Create and manage compliance rules for content evaluation",
    href: "/style-guide/pages/compliance-rules",
    icon: CheckCircleIcon,
  },
];

export default function StyleGuidePage(): React.ReactElement {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography level="h1">Style Guide</Typography>
        <Typography level="body-lg" color="neutral">
          Manage your brand's written and visual style guides, vocabulary, compliance rules, and content evaluation
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {navigationCards.map((card) => {
          const Icon = card.icon;
          return (
            <Grid xs={12} sm={6} key={card.href}>
              <Card
                component={NextLink}
                href={card.href}
                variant="outlined"
                sx={{
                  height: "100%",
                  textDecoration: "none",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.400",
                    boxShadow: "sm",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Stack
                        sx={{
                          p: 1.5,
                          borderRadius: "sm",
                          bgcolor: "primary.50",
                          color: "primary.600",
                        }}
                      >
                        <Icon size={24} weight="bold" />
                      </Stack>
                      <Stack spacing={0.5} flex={1}>
                        <Typography level="title-lg">{card.title}</Typography>
                        <Typography level="body-sm" color="neutral">
                          {card.description}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

