import { useQuery } from "@tanstack/react-query"

import { type ConfigResponse, UtilsService } from "@/client"

const useAuthConfig = () => {
  return useQuery<ConfigResponse, Error>({
    queryKey: ["authConfig"],
    queryFn: async () => (await UtilsService.readConfig()).data,
    staleTime: 5 * 60 * 1000,
  })
}

export default useAuthConfig
