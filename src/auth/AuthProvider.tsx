import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { PortalRole } from "../types/domain";
type State={user:User|null;roles:PortalRole[];loading:boolean;signOut:()=>Promise<void>};
const AuthContext=createContext<State|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null);const [roles,setRoles]=useState<PortalRole[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;const client=supabase;if(!client){setLoading(false);return;}
 async function update(next:User|null){if(!active||!client)return;setLoading(true);setUser(next);setRoles([]);
  if(next){const {data,error}=await client.from("user_role_assignments").select("role").eq("user_id",next.id);
   if(!error&&active)setRoles((data??[]).map(row=>row.role as PortalRole));}
  if(active)setLoading(false);
 }
 void client.auth.getUser().then(({data})=>update(data.user)).catch(()=>{if(active)setLoading(false);});
 const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>{void update(session?.user??null);},0);});
 return()=>{active=false;subscription.unsubscribe();};
 },[]);
 async function signOut(){if(supabase)await supabase.auth.signOut();}
 return <AuthContext.Provider value={{user,roles,loading,signOut}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const state=useContext(AuthContext);if(!state)throw new Error("Missing AuthProvider");return state;}
