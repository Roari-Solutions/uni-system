import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./authContext";

/** Reads the session. Throws when used outside <AuthProvider>. */
const useAuth = (): AuthContextValue => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
	return context;
};

export default useAuth;
