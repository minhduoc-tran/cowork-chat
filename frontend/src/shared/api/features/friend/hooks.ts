import { useQuery } from "@tanstack/react-query"

import { friendApi } from "./api"

export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: () => friendApi.list().then((res) => res.data.data),
  })
}
