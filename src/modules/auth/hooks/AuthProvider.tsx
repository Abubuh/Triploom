import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as authService from "../services/authService";
import type { AuthState, Profile } from "../types/auth.types";
import { AuthContext } from "./useAuth";
import * as profileService from "../services/profileService";
interface AuthProviderProps {
  children: ReactNode;
  onPendingInvite?: (token: string) => void;
}
export function AuthProvider({ children, onPendingInvite }: AuthProviderProps) {
  const [state, setState] = useState<
    AuthState & { authLoading: boolean; profileLoading: boolean }
  >({
    session: null,
    user: null,
    profile: null,
    loading: true,
    authLoading: true,
    profileLoading: false,
  });

  const onPendingInviteRef = useRef(onPendingInvite);

  useEffect(() => {
    onPendingInviteRef.current = onPendingInvite;
  }, [onPendingInvite]);

  useEffect(() => {
    if (!state.user?.id) {
      setState((prev) => ({
        ...prev,
        profile: null,
        profileLoading: false,
      }));
      return;
    }

    let cancelled = false;
    const userId = state.user.id;

    const fetchProfile = async () => {
      setState((prev) => ({ ...prev, profileLoading: true }));

      try {
        const { data } = await profileService.getProfile(userId);

        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          profile: data,
          profileLoading: false,
        }));
      } catch (err) {
        if (cancelled) return;

        console.error("PROFILE ERROR:", err);

        setState((prev) => ({
          ...prev,
          profileLoading: false,
        }));
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [state.user]);
  useEffect(() => {
    let mounted = true;

    const { unsubscribe } = authService.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "INITIAL_SESSION") {
          setState((prev) => ({
            ...prev,
            session,
            user: session?.user ?? null,
            authLoading: false,
          }));
          return;
        }

        if (event === "SIGNED_IN" && session?.user) {
          setState((prev) => ({
            ...prev,
            session,
            user: session.user,
            profile: null,
            authLoading: false,
            profileLoading: true,
          }));

          const pendingToken = localStorage.getItem("pendingInviteToken");
          if (pendingToken) {
            localStorage.removeItem("pendingInviteToken");
            onPendingInviteRef.current?.(pendingToken);
          }

          return;
        }

        if (event === "SIGNED_OUT") {
          setState((prev) => ({
            ...prev,
            session: null,
            user: null,
            profile: null,
            authLoading: false,
            profileLoading: false,
          }));
          return;
        }

        if (event === "USER_UPDATED" && session) {
          setState((prev) => ({
            ...prev,
            session,
            user: session.user,
          }));
        }
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
  };

  const setProfile = (profile: Profile) => {
    setState((prev) => ({ ...prev, profile }));
  };
  const loading = state.authLoading || state.profileLoading;
  return (
    <AuthContext.Provider
      value={{
        ...state,
        loading,
        signOut: handleSignOut,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
