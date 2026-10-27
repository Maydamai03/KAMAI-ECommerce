import { useQuery } from "@tanstack/react-query";
import { getStoreInfo } from "../services/store";

export function useStoreInfo() {
  return useQuery({
    queryKey: ["store"],
    queryFn: getStoreInfo,
    staleTime: 10 * 60_000,
    retry: false,
  });
}