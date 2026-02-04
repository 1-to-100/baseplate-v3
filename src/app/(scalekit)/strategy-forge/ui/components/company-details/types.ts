import type { ReactNode } from 'react';

// A simplified person type that works with people data
export interface SimplePerson {
  id: number;
  name: string;
  titles?: string[];
  emails?: string | string[];
  phones?: string[];
  image?: string | null;
  companies?: { title?: string; name?: string; employer?: string; description?: string }[];
}

// Common company details data that both Company and segment Company can map to
export interface CompanyDetailsData {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  type?: string;
  employees?: number;
  categories?: string[];
  country?: string;
  region?: string;
  address?: string;
  email?: string;
  phone?: string;
  revenue?: number;
  currencyCode?: string;
  lastScoringResults?: FitScoreData | null;
}

export interface FitScoreData {
  score: number;
  shortDescription: string;
  fullDescription?: string;
}

// Props for the header component
export interface CompanyDetailsHeaderProps {
  company: CompanyDetailsData;
  breadcrumbs: ReactNode;
  onEditClick?: () => void;
  onMenuOpen?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRefreshClick?: () => void;
  showEditButton?: boolean;
  showMenuButton?: boolean;
  showFilterButton?: boolean;
  onFilterClick?: () => void;
}

// Props for the fit score box
export interface FitScoreBoxProps {
  score?: number;
  description?: string;
  hasScore: boolean;
}

// Props for company overview section
export interface CompanyOverviewSectionProps {
  company: CompanyDetailsData;
  onDebugClick?: () => void;
  showDebugButton?: boolean;
}

// Props for key contacts section
export interface KeyContactsSectionProps {
  people: SimplePerson[];
  isLoading: boolean;
  onShowAllLeads?: () => void;
  showAllLeadsButton?: boolean;
}

// Props for leads view
export interface CompanyLeadsViewProps {
  company: CompanyDetailsData;
  breadcrumbs: ReactNode;
  people: SimplePerson[];
  totalCount: number;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onBackClick: () => void;
  onEditClick?: () => void;
  onMenuOpen?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFilterClick?: () => void;
  showEditButton?: boolean;
  showMenuButton?: boolean;
  // PeopleList state props (for future use with PeopleList component)
  selectedRows: string[];
  handleRowCheckboxChange: (personId: string) => void;
  handleSelectAllChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleMenuOpen: (event: React.MouseEvent<HTMLElement>, index: number) => void;
  handleMenuClose: () => void;
  menuRowIndex: number | null;
  anchorEl: HTMLElement | null;
  handleNavigation: (url: string) => boolean;
  handleOpenPersonPopover: (idx: number, event: React.MouseEvent<HTMLElement>) => void;
  handleEdit: (personId: string) => void;
  handleDeletePerson: (personId: string) => void;
  openPersonPopoverIdx: number | null;
  personPopoverAnchorEl: HTMLElement | null;
  handleClosePersonPopover: () => void;
}

// Props for debug json modal
export interface DebugJsonModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data?: unknown;
  isLoading?: boolean;
  error?: Error | null;
}

// Props for header menu
export interface CompanyHeaderMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onAddToList?: () => void;
  onExport?: () => void;
  showAddToList?: boolean;
  showExport?: boolean;
  popperRef?: React.RefObject<HTMLDivElement | null>;
}
