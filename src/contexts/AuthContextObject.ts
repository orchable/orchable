import { createContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { UserProfile } from "@/lib/types";

export interface AuthContextType {
	user: User | null;
	session: Session | null;
	profile: UserProfile | null;
	isLoading: boolean;
	signOut: () => Promise<void>;
	refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
	user: null,
	session: null,
	profile: null,
	isLoading: true,
	signOut: async () => {},
	refreshProfile: async () => {},
});
