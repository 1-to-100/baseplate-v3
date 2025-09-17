import { useQuery } from '@tanstack/react-query';
import { getUserInfo } from '@/lib/api/users';

export const useUserInfo = () => {

  const { data: userInfo, isLoading: isUserLoading, error } = useQuery({
    queryKey: ['userInfo'],
    queryFn: () => getUserInfo(),
  });

  return { userInfo, isUserLoading, error };
};