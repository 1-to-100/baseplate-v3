import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { ChartPie as ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { CurrencyBtc as CurrencyBtcIcon } from '@phosphor-icons/react/dist/ssr/CurrencyBtc';
import { File as FileIcon } from '@phosphor-icons/react/dist/ssr/File';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { GridFour as GridFourIcon } from '@phosphor-icons/react/dist/ssr/GridFour';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { Kanban as KanbanIcon } from '@phosphor-icons/react/dist/ssr/Kanban';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Question as QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { ShoppingCart as ShoppingCartIcon } from '@phosphor-icons/react/dist/ssr/ShoppingCart';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Thermometer as ThermometerIcon } from '@phosphor-icons/react/dist/ssr/Thermometer';
import { Truck as TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { HandTap as HandTap } from '@phosphor-icons/react/dist/ssr/HandTap';
import { UsersThree as UsersThree } from '@phosphor-icons/react/dist/ssr/UsersThree';
import { Money as Money } from '@phosphor-icons/react/dist/ssr/Money';
import { Files as Files } from '@phosphor-icons/react/dist/ssr/Files';
import { Headphones as Headphones } from '@phosphor-icons/react/dist/ssr/Headphones';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { UserList as UserListIcon } from '@phosphor-icons/react/dist/ssr/UserList';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';
import { BagSimple as BagSimpleIcon } from '@phosphor-icons/react/dist/ssr/BagSimple';
import { UserFocus as UserFocusIcon } from '@phosphor-icons/react/dist/ssr/UserFocus';

export const icons = {
  'chart-pie': ChartPieIcon,
  'currency-btc': CurrencyBtcIcon,
  'gear-six': GearSixIcon,
  'grid-four': GridFourIcon,
  'shopping-bag': ShoppingBagIcon,
  'shopping-cart': ShoppingCartIcon,
  'sign-out': SignOutIcon,
  'user': UsersIcon,
  'role': HandTap,
  'customer': UsersThree,
  'accounting': Money,
  'documentation': Files,
  'help': Headphones,
  'bell': BellIcon,
  'user-list': UserListIcon,
  'user-gear': UserGearIcon,
  'bag-simple': BagSimpleIcon,
  'user-focus': UserFocusIcon,
  buildings: BuildingsIcon,
  file: FileIcon,
  house: HouseIcon,
  kanban: KanbanIcon,
  package: PackageIcon,
  question: QuestionIcon,
  receipt: ReceiptIcon,
  storefront: StorefrontIcon,
  thermometer: ThermometerIcon,
  truck: TruckIcon,
  users: UsersIcon,
} as Record<string, Icon>;
