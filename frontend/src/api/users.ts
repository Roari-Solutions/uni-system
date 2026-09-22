import api from "../lib/api";
import type { AssignableRole, ManagedUser } from "../types/user";

export type UserFilters = {
	facultyId?: string;
	role?: string;
	q?: string;
};

export type UserPayload = {
	name: string;
	email: string;
	password: string;
	role: string;
	// omitted for staff who span every faculty, such as admins
	facultyId?: string;
	phone?: string;
};

export const fetchRoles = async (): Promise<AssignableRole[]> => {
	const { data } = await api.get<AssignableRole[]>("/admin/roles");
	return data;
};

export const fetchUsers = async (filters: UserFilters = {}): Promise<ManagedUser[]> => {
	const { data } = await api.get<ManagedUser[]>("/admin/users", { params: filters });
	return data;
};

export const createUser = async (payload: UserPayload): Promise<ManagedUser> => {
	const { data } = await api.post<ManagedUser>("/admin/users", payload);
	return data;
};

/** Suspending is how a user is removed; nothing is ever deleted. */
export const setUserSuspended = async (
	id: string,
	suspended: boolean,
): Promise<ManagedUser> => {
	const { data } = await api.patch<ManagedUser>(`/admin/users/${id}`, { suspended });
	return data;
};

export const resetUserPassword = async (id: string, password: string): Promise<void> => {
	await api.post(`/admin/users/${id}/password`, { password });
};
