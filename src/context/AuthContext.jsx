import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, logoutUser, registerUser } from "../services/auth";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================
  // 🔥 AUTH STATE
  // ============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ============================
  // 🔥 USER DATA REALTIME
  // ============================
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        setUserData({
          ...data,
          isAdmin: data?.role === "admin" // 🔥 AQUI ESTÁ O ADMIN
        });
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ============================
  // 🔥 ONLINE STATUS (lastActive)
  // ============================
useEffect(() => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);

  const updateActivity = async () => {
    try {
      await updateDoc(ref, {
        lastActive: Date.now()
      });
    } catch (err) {
      console.error("Erro ao atualizar lastActive:", err);
    }
  };

  updateActivity();

  const interval = setInterval(updateActivity, 60000);

  return () => clearInterval(interval);
}, [user]);

  // ============================
  // 🔥 LOGIN
  // ============================
  const login = async (email, senha) => {
    try {
      await loginUser(email, senha);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // ============================
  // 🔥 REGISTER
  // ============================
  const register = async ({ username, email, senha, bio, foto }) => {
    try {
      const userCredential = await registerUser(email, senha);
      const user = userCredential.user;

      let photoURL = "";

      if (foto) {
        photoURL = URL.createObjectURL(foto);
      } else {
        photoURL = `https://ui-avatars.com/api/?name=${username}`;
      }

      await setDoc(doc(db, "users", user.uid), {
        username,
        email: user.email,
        photoURL,
        bio: bio || "",
        role: "user", // 🔥 padrão obrigatório
        lastActive: Date.now()
      });

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // ============================
  // 🔥 LOGOUT
  // ============================
  const logout = async () => {
    await logoutUser();
    setUser(null);
    setUserData(null);
  };



  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        login,
        logout,
        register,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);