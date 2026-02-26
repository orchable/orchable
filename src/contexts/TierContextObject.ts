import { createContext } from "react";
import { UserTier } from "@/lib/storage";

export interface TierContextType {
	tier: UserTier;
	isPremium: boolean;
	isSyncing: boolean;
	usage: { count: number; month: string } | null;
	limits: {
		tasks: number;
		sync: boolean;
	};
	refreshUsage: () => Promise<void>;
}

export const TierContext = createContext<TierContextType | undefined>(
	undefined,
);
