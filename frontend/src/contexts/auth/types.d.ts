import type { User } from "@/types/user";
import { Customer } from "@/lib/api/customers";
import { Role } from "@/lib/api/roles";

export interface UserContextValue {
  user: User | null;
  error: string | null;
  isLoading: boolean;
  checkSession?: () => Promise<void>;
  updateUser?: (user: User) => void;
  syncUser?: () => void;
  role?: string | null;
  permissions?: string[];
}

export interface ApiUser {
  managerId: string;
  manager?: {
    id: string;
    name: string;
  };
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  customerId?: string;
  customer?: Customer;
  roleId?: string;
  role?: Role;
  persona?: string;
  status: string;
  avatar?: string;
  createdAt?: string;
  phoneNumber?: string;
  isSuperadmin?: boolean;
  isCustomerSuccess?: boolean;
  permissions?: string[];
  activity?: {
    id: number;
    browserOs: string;
    locationTime: string;
  }[];
}

export interface Role {
  role_id: string;
  name: string;
  display_name: string;
  description: string | null;
  systemRole?: boolean;
  permissions: PermissionsByModule;
  _count: {
    users: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  subscriptionId: string;
  managerId: string;
  customerSuccessId: string;
  ownerId: string;
  numberOfUsers?: number;
  status: string;
  subscriptionName: string;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  customerSuccess?: Array<{
    id: string;
    name: string;
    email: string | null;
    avatarUrl?: string;
  }>;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Category {
  id: string;
  name: string;
  subcategory: string;
  about: string;
  icon: string;
  articlesCount: number;
  updatedAt: string;
  Creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Article {
  id: string;
  title: string;
  articleCategoryId: string;
  subcategory: string;
  status: string;
  content: string;
  videoUrl: string;
  updatedAt: string;
  viewsNumber: number;
  Creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  Category: {
    id: string;
    name: string;
  };
}

export interface SystemUser {
  managerId: string;
  manager?: {
    id: string;
    name: string;
  };
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  customerId?: string;
  customer?: Customer;
  roleId?: string;
  role?: Role;
  persona?: string;
  status: string;
  avatar?: string;
  createdAt?: string;
  phoneNumber?: string;
  isSuperadmin?: boolean;
  isCustomerSuccess?: boolean;
  systemRole?: SystemRoleObject;
  activity?: {
    id: number;
    browserOs: string;
    locationTime: string;
  }[];
}

export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  comment: string;
  createdAt: string;
  isRead?: boolean;
  channel: string;
  type: string;
  User?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  Customer?: { 
    id: string;
    name: string;
  };
}

export interface NotificationType {  
    types: string[];
    channels: string[];
  }

export interface SystemRoleObject {
  id: string;
  name: string;
}

export type SystemRole = "customer_success" | "system_admin";

export type Status = "active" | "inactive" | "suspended";

export type TaxonomyItem = {
  id: string;
  name: string;
}
