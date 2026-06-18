import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const admin = !!data?.some((r: { role: string }) => r.role === 'admin');
    setIsAdmin(admin);

    // Detect whether any admin exists (only matters for bootstrap)
    const { count } = await supabase
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    setAdminExists((count ?? 0) > 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isAdmin, adminExists, loading, refresh };
}
