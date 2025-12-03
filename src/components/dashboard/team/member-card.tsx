'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@mui/joy/Avatar';
import Badge from '@mui/joy/Badge';
import Card from '@mui/joy/Card';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import Link from '@mui/joy/Link';
import Stack from '@mui/joy/Stack';
import Tooltip from '@mui/joy/Tooltip';
import Typography from '@mui/joy/Typography';
import { ClockCountdown as ClockCountdownIcon } from '@phosphor-icons/react/dist/ssr/ClockCountdown';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { ShieldCheckered as ShieldCheckeredIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheckered';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';

import { paths } from '@/paths';

import { MemberMenu } from './member-menu';

const roleMapping = {
  admin: { label: 'Admin', icon: ShieldCheckeredIcon },
  member: { label: 'Member', icon: UserIcon },
  readOnly: { label: 'Read Only', icon: EyeIcon },
} as const;

const statusMapping = { online: 'success', offline: 'neutral', away: 'warning', busy: 'danger' } as const;

const tagMapping = { All: 'neutral', Marketing: 'primary', Design: 'success', Development: 'warning' } as const;

export interface Member {
  id: string;
  avatar?: string;
  name: string;
  username: string;
  role: 'admin' | 'member' | 'readOnly';
  position: string;
  tags: string[];
  status: 'online' | 'offline' | 'away' | 'busy';
  pending?: boolean;
}

export interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps): React.JSX.Element {
  const { avatar, name, role, position, tags, status, pending } = member;
  const { label: roleLabel, icon: RoleIcon } = roleMapping[role] ?? { label: 'Unknown', icon: UserIcon };

  const router = useRouter();

  return (
    <Card>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Badge
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          color={statusMapping[status]}
          size="sm"
          sx={{ '& .MuiBadge-badge': { right: '6px', bottom: '6px' } }}
        >
          <Avatar
            component={RouterLink}
            href={paths.dashboard.team.members.details('1')}
            src={avatar}
            sx={{ '--Avatar-size': '48px' }}
          />
        </Badge>
        <MemberMenu
          onView={(): void => {
            router.push(paths.dashboard.team.members.details('1'));
          }}
          pending={pending}
        />
      </Stack>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0.5}>
          <Link
            component={RouterLink}
            fontWeight="md"
            href={paths.dashboard.team.members.details('1')}
            level="body-sm"
            textColor="text.primary"
            underline="none"
          >
            {name}
          </Link>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <RoleIcon color="var(--joy-palette-primary-800)" fontSize="var(--joy-fontSize-md)" />
            <Typography level="body-xs">{roleLabel}</Typography>
          </Stack>
        </Stack>
        {pending ? (
          <Tooltip title="Invitation sent" variant="solid">
            <Avatar color="warning" size="sm" sx={{ '--Icon-fontSize': 'var(--joy-fontSize-xl)' }}>
              <ClockCountdownIcon fontSize="var(--Icon-fontSize)" weight="bold" />
            </Avatar>
          </Tooltip>
        ) : null}
      </Stack>
      <Divider />
      <Stack spacing={0.5}>
        <Typography level="body-xs" textTransform="uppercase">
          Position
        </Typography>
        <Typography level="body-sm" textColor="text.primary">
          {position}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography level="body-xs" textTransform="uppercase">
          Tags
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {tags.map((tag): React.JSX.Element => {
            const color = tagMapping[tag as keyof typeof tagMapping] ?? 'neutral';

            return (
              <Chip color={color} key={tag} size="sm" variant="soft">
                {tag}
              </Chip>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
