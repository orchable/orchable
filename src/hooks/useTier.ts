import { useContext } from "react";
import { TierContext } from "@/contexts/TierContext";

export const useTier = () => {
	const context = useContext(TierContext);
	if (context === undefined) {
		throw new Error("useTier must be used within a TierProvider");
	}
	return context;
};
