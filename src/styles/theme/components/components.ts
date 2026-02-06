import type { Components, Theme } from '@mui/joy/styles';
import type { ComponentsConfig } from '../theme-config';

import { JoyBreadcrumbs } from './breadcrumbs';
import { createButtonOverride } from './button';
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
import { createCheckboxOverride } from './checkbox';

export function createComponents(config?: ComponentsConfig): Components<Theme> {
  return {
    JoyBreadcrumbs,
    JoyButton: createButtonOverride(config?.button),
    JoyCard,
    JoyCheckbox: createCheckboxOverride(config?.checkbox),
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
  };
}
