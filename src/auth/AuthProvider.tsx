import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { PortalRole } from "../types/domain";

type State = {
  user: User | null;
  roles: PortalRole[];
  roleError: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  reloadRoles: () => void;
};

const AuthContext = createContext<State | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<PortalRole[]>([]);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);
  const userRef = useRef<User | null>(null);

  const loadRoles = useCallback(async (next: User | null) => {
    const client = supabase;
    if (!client) return;
    userRef.current = next;
    setUser(next);
    setRoles([]);
    setRoleError(null);
    if (next) {
      setLoading(true);
      const { data, error } = await client.from("user_role_assignments").select("role").eq("user_id", next.id);
      if (!activeRef.current) return;
      if (error) setRoleError("We couldn't load your permissions. Check your connection and try again.");
      else setRoles((data ?? []).map((row) => row.role as PortalRole));
    }
    if (activeRef.current) setLoading(false);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }
    void client.auth
      .getUser()
      .then(({ data }) => loadRoles(data.user))
      .catch(() => {
        if (activeRef.current) setLoading(false);
      });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void loadRoles(session?.user ?? null);
      }, 0);
    });
    return () => {
      activeRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadRoles]);

  const reloadRoles = useCallback(() => {
    void loadRoles(userRef.current);
  }, [loadRoles]);

  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, roles, roleError, loading, signOut, reloadRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("Missing AuthProvider");
  return state;
}
