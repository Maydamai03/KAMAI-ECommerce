import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "../services/addresses";
import type { AddressInput } from "../types";

const KEY = ["addresses"];

export function useAddresses(enabled: boolean) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const list = useQuery({
    queryKey: KEY,
    queryFn: getAddresses,
    enabled,
  });

  const create = useMutation({
    mutationFn: (input: AddressInput) => createAddress(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddressInput }) => updateAddress(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: invalidate,
  });

  return { list, create, update, remove };
}