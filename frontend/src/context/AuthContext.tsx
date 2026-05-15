import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { isLoggedIn, clearToken, clearCredentials } from '../api';

interface AuthContextType {
  authenticated: boolean;
  loading: boolean;
  setAuthenticated: (v: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  loading: true,
  setAuthenticated: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      setAuthenticated(loggedIn);
      setLoading(false);
    });
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    await clearCredentials();
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, loading, setAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook must co-locate with provider
export function useAuth() {
  return useContext(AuthContext);
}
