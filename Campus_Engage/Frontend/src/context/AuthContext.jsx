import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';

// 1. Create the Context
const AuthContext = createContext();

// 2. The Provider Component (Wraps your app)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores full user object (name, avatar, role)
  const [loading, setLoading] = useState(true);

  // Check if user is logged in when app loads
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // 🛑 We need an endpoint '/current-user' to fetch data on reload
          const response = await api.get('/api/users/current-user');
          setUser(response.data.data);
        } catch (error) {
          console.log(error);
          console.error("Session expired or invalid");
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  // 3. Login Function (Call this from LoginPage)
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData); // 👈 Save the user data globally!
  };

  // 4. Logout Function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 5. Custom Hook (Easy access)
export const useAuth = () => useContext(AuthContext);