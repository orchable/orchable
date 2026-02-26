import { useRole, UserRole } from "@/contexts/RoleContext";

export function useRoleGuard(requiredRole: UserRole) {
	const { role, isAdmin, isLoading } = useRole();

	const hasAccess = () => {
		if (isLoading) return false;
		if (requiredRole === "superadmin") return role === "superadmin";
		if (requiredRole === "admin")
			return role === "admin" || role === "superadmin";
		return true; // 'user' role is the base
	};

	return {
		hasAccess: hasAccess(),
		role,
		isAdmin,
		isLoading,
	};
}
