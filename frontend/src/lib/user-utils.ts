import {ApiUser} from "@/contexts/auth/types";

export const isUserOwner = (ownerUser?: ApiUser, user?: ApiUser): boolean => {

  if(ownerUser?.customer?.ownerId === ownerUser?.id ) {
    return true;
  }

  if (!ownerUser || !user) return false;

  // Check if the ownerUser is a superadmin
  if (ownerUser.isSuperadmin) return true;

  // Check if the ownerUser is a customer success manager and the user belongs to the same customer
  if (
    ownerUser.isCustomerSuccess &&
    ownerUser.customerId === user.customerId
  ) {
    return true;
  }

  if(ownerUser?.customer?.ownerId === ownerUser.id && ownerUser.customerId === user.customerId) {
    return true;
  }

  return false;
}