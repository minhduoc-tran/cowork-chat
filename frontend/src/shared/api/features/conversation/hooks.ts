import { useQuery } from "@tanstack/react-query"

import { conversationApi } from "./api"

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => conversationApi.list().then((res) => res.data.data),
  })
}
