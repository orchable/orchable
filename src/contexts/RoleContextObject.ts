import { createContext } from "react";

export type UserRole = "user" | "admin" | "superadmin";

export interface RoleContextType {
	role: UserRole;
	isAdmin: boolean;
	isSuperAdmin: boolean;
	isLoading: boolean;
}

export const RoleContext = createContext<RoleContextType>({
	role: "user",
	isAdmin: false,
	isSuperAdmin: false,
	isLoading: true,
});
