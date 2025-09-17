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
  managerId: number;
  manager?: {
    id: number;
    name: string;
  };
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  customerId?: number;
  customer?: Customer;
  roleId?: number;
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
  id: number;
  name: string;
  description: string | null;
  permissions: PermissionsByModule;
  _count: {
    users: number;
  };
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  subscriptionId: number;
  managerId: number;
  customerSuccessId: number;
  ownerId: number;
  numberOfUsers?: number;
  status: string;
  subscriptionName: string;
  manager: {
    id: number;
    name: string;
    email: string;
  };
  customerSuccess?: {
    id: number;
    name: string;
    email: string;
  };
  owner: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface Category {
  id: number;
  name: string;
  subcategory: string;
  about: string;
  icon: string;
  _count: {
    Articles: number;
  };
  updatedAt: string;
  Creator: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface Article {
  id: number;
  title: string;
  articleCategoryId: number;
  subcategory: string;
  status: string;
  content: string;
  videoUrl: string;
  updatedAt: string;
  viewsNumber: number;
  Creator: {
    id: number;
    firstName: string;
    lastName: string;
  };
  Category: {
    id: number;
    name: string;
  };
}

export interface SystemUser {
  managerId: number;
  manager?: {
    id: number;
    name: string;
  };
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  customerId?: number;
  customer?: Customer;
  roleId?: number;
  role?: Role;
  persona?: string;
  status: string;
  avatar?: string;
  createdAt?: string;
  phoneNumber?: string;
  isSuperadmin?: boolean;
  isCustomerSuccess?: boolean;
  systemRole?: SystemRole;
  activity?: {
    id: number;
    browserOs: string;
    locationTime: string;
  }[];
}

export interface ApiNotification {
  id: number;
  title: string;
  message: string;
  comment: string;
  createdAt: string;
  isRead?: boolean;
  channel: string;
  type: string;
  User?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  Customer?: { 
    id: number;
    name: string;
  };
}

export interface NotificationType {  
    types: string[];
    channels: string[];
  }

export type SystemRole =  "customer_success" | "system_admin";

export type Status = "active" | "inactive" | "suspended";
