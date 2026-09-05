import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'editor';

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderador',
  editor: 'Editor',
};

export function useAdminRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [adminExists, setAdminExists] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    setRoles(((data ?? []) as { role: string }[]).map((r) => r.role as AdminRole));
    const { data: exists } = await (supabase.rpc as any)('admin_exists');
    setAdminExists(!!exists);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const has = useCallback((...r: AdminRole[]) => r.some((x) => roles.includes(x)), [roles]);

  return {
    roles,
    loading,
    adminExists,
    refresh,
    has,
    isStaff: roles.length > 0,
    isSuperAdmin: roles.includes('super_admin'),
    canManageUsers: has('super_admin', 'admin', 'moderator'),
    canManageContent: has('super_admin', 'admin', 'editor'),
    canManageSettings: has('super_admin', 'admin'),
  };
}
