import type { Components, Theme } from '@mui/joy/styles';

import { JoyBreadcrumbs } from './breadcrumbs';
import { JoyButton } from './button';
import { JoyCard } from './card';
import { JoyDrawer } from './drawer';
import { JoyIconButton } from './icon-button';
import { JoyInput } from './input';
import { JoyLink } from './link';
import { JoyModal } from './modal';
import { JoySelect } from './select';
import { JoyStack } from './stack';
import { JoyTable } from './table';
import { JoyTabs } from './tabs';
import { JoyTextarea } from './textarea';
import { JoyCheckbox } from './checkbox';

// currently these are not being used in the project as of now as we are moving to configuring theme using json file. Earlier this was used to configure the theme.
// Have to decide what to do with this.
export const components = {
  JoyBreadcrumbs,
  JoyButton,
  JoyCard,
  JoyDrawer,
  JoyIconButton,
  JoyInput,
  JoyLink,
  JoyModal,
  JoySelect,
  JoyStack,
  JoyTable,
  JoyTabs,
  JoyTextarea,
  JoyCheckbox,
} satisfies Components<Theme>;
