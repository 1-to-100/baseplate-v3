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
  House as HouseIcon,
  Target as TargetIcon,
  Eye as EyeIcon,
  ShuffleAngular as ShuffleAngularIcon,
  Heart as HeartIcon,
  Users as UsersIcon,
  User as UserIcon,
  ChartBar as ChartBarIcon,
  MapTrifold as MapTrifoldIcon,
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
    title: "Overview",
    description: "View your complete strategy at a glance",
    href: "/strategy-forge/overview",
    icon: HouseIcon,
  },
  {
    title: "Mission",
    description: "Define your company's core purpose and mission",
    href: "/strategy-forge/edit/mission",
    icon: TargetIcon,
  },
  {
    title: "Vision",
    description: "Articulate your long-term vision and goals",
    href: "/strategy-forge/edit/vision",
    icon: EyeIcon,
  },
  {
    title: "Principles",
    description: "Establish guiding principles for decision-making",
    href: "/strategy-forge/edit/principles",
    icon: ShuffleAngularIcon,
  },
  {
    title: "Values",
    description: "Define your company's core values",
    href: "/strategy-forge/edit/values",
    icon: HeartIcon,
  },
  {
    title: "Competitors",
    description: "Track and analyze your competitive landscape",
    href: "/strategy-forge/competitors",
    icon: UsersIcon,
  },
  {
    title: "Personas",
    description: "Define and manage customer personas",
    href: "/strategy-forge/personas",
    icon: UserIcon,
  },
  {
    title: "Segments",
    description: "Organize and manage market segments",
    href: "/strategy-forge/segments",
    icon: ChartBarIcon,
  },
  {
    title: "Customer Journey",
    description: "Map customer journey stages and touchpoints",
    href: "/strategy-forge/customer-journey-stages",
    icon: MapTrifoldIcon,
  },
];

export default function StrategyForgePage(): React.ReactElement {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography level="h1">Strategy Forge</Typography>
        <Typography level="body-lg" color="neutral">
          Manage your company strategy, customer insights, and competitive intelligence
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
