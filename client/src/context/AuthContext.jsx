import { createContext, useContext, useEffect, useState } from "react";
import { getMe, loginUser, registerUser } from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("yordamai_token"));
  const [loading, setLoading] = useState(true);

  const register = async (data) => {
    const result = await registerUser(data);

    if (result.token) {
      localStorage.setItem("yordamai_token", result.token);
      setToken(result.token);
      setUser(result.user);
    }

    return result;
  };

  const login = async (data) => {
    const result = await loginUser(data);

    if (result.token) {
      localStorage.setItem("yordamai_token", result.token);
      setToken(result.token);
      setUser(result.user);
    }

    return result;
  };

  const logout = () => {
    localStorage.removeItem("yordamai_token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      const result = await getMe(token);

      if (result.user) {
        setUser(result.user);
      } else {
        logout();
      }

      setLoading(false);
    };

    loadUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);