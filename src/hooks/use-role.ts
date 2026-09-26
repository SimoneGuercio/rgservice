import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRole() {
  const q = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { email: null as string | null, isAdmin: false };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return { email: u.user.email ?? null, isAdmin: !!data?.some((r) => r.role === "admin") };
    },
  });
  return { isAdmin: q.data?.isAdmin ?? false, email: q.data?.email ?? null, loading: q.isLoading };
}
