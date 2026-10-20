import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/api";
import { getMe, loginUser, logoutUser, registerUser } from "../services/auth";

const ME_KEY = ["me"];

export function useAuth() {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await getMe()).user;
      } catch (e) {
        // Belum login bukan error, cukup dianggap tidak ada pengguna
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const login = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => queryClient.setQueryData(ME_KEY, data.user),
  });

  const register = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => queryClient.setQueryData(ME_KEY, data.user),
  });

  const logout = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => queryClient.setQueryData(ME_KEY, null),
  });

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    login,
    register,
    logout,
  };
}