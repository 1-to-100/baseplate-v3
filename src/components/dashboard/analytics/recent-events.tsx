import * as React from 'react';
import Avatar from '@mui/joy/Avatar';
import Card from '@mui/joy/Card';
import Link from '@mui/joy/Link';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Typography from '@mui/joy/Typography';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { Browser as BrowserIcon } from '@phosphor-icons/react/dist/ssr/Browser';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { CursorClick as CursorClickIcon } from '@phosphor-icons/react/dist/ssr/CursorClick';
import { ReceiptX as ReceiptXIcon } from '@phosphor-icons/react/dist/ssr/ReceiptX';
import { ShoppingCart as ShoppingCartIcon } from '@phosphor-icons/react/dist/ssr/ShoppingCart';
import dayjs from 'dayjs';

const iconMapping = {
  page_view: BrowserIcon,
  click: CursorClickIcon,
  add_product: ShoppingCartIcon,
  purchase: CreditCardIcon,
  refund_request: ReceiptXIcon,
} as Record<string, Icon>;

export type Event = { id: string; createdAt: Date } & (
  | { type: 'page_view'; url: string }
  | { type: 'click'; text: string }
  | { type: 'add_product'; productId: string }
  | { type: 'purchase'; orderId: string }
  | { type: 'refund_request'; orderId: string }
);

export interface RecentEventsProps {
  events?: Event[];
}

export function RecentEvents({ events = [] }: RecentEventsProps): React.JSX.Element {
  return (
    <Card>
      <Typography level="h4">Recent Events</Typography>
      <List
        sx={{
          '--List-padding': 0,
          '--ListItem-paddingX': 0,
          '--ListItem-paddingY': '8px',
          '--ListItemDecorator-size': '56px',
          '& > *:not(:last-of-type)': { borderBottom: '1px solid var(--joy-palette-divider)' },
        }}
      >
        {events.map((event): React.JSX.Element => {
          const Icon = iconMapping[event.type] as Icon | undefined;
          const { label, description } = getContent(event);

          return (
            <ListItem key={event.id}>
              <ListItemDecorator>
                {Icon ? (
                  <Avatar>
                    <Icon fontSize="var(--Icon-fontSize)" weight="bold" />
                  </Avatar>
                ) : null}
              </ListItemDecorator>
              <ListItemContent>
                <Typography noWrap>{label}</Typography>
                <Typography level="body-sm" noWrap>
                  {description}
                </Typography>
              </ListItemContent>
              <Typography level="body-xs" whiteSpace="nowrap">
                {dayjs().diff(event.createdAt, 'minute')} min ago
              </Typography>
            </ListItem>
          );
        })}
      </List>
    </Card>
  );
}

function getContent(event: Event): { label: string; description: React.JSX.Element | string } {
  switch (event.type) {
    case 'page_view':
      return {
        label: 'Page View',
        description: (
          <React.Fragment>
            Visited{' '}
            <Typography fontWeight="md" textColor="text.primary">
              {event.url}
            </Typography>
          </React.Fragment>
        ),
      };

    case 'click':
      return {
        label: 'Click element',
        description: (
          <React.Fragment>
            Clicked on{' '}
            <Typography fontWeight="md" textColor="text.primary">
              {event.text}
            </Typography>
          </React.Fragment>
        ),
      };

    case 'add_product':
      return {
        label: 'Add Product',
        description: (
          <React.Fragment>
            Added product <Link fontWeight="md">{event.productId}</Link> to cart
          </React.Fragment>
        ),
      };

    case 'purchase':
      return {
        label: 'Purchase',
        description: (
          <React.Fragment>
            Placed order <Link fontWeight="md">{event.orderId}</Link>
          </React.Fragment>
        ),
      };

    case 'refund_request':
      return {
        label: 'Refund request',
        description: (
          <React.Fragment>
            Requested refund for order <Link fontWeight="md">{event.orderId}</Link>
          </React.Fragment>
        ),
      };

    default:
      return { label: 'Unknown event', description: '' };
  }
}
