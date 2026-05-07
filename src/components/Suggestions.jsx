import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  followUser,
  unfollowUser,
  listenFollowing
} from "../services/followService";
import '../styles/suggestions.css'

export default function Suggestions() {
  const { user, userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState([]);

  const navigate = useNavigate();

  // 🔥 quem eu sigo
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenFollowing(user.uid, (ids) => {
      setFollowing(ids);
    });

    return () => unsubscribe();
  }, [user]);

  // 🔥 pegar usuários
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));

      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ❌ remove eu mesmo
      data = data.filter((u) => u.id !== user.uid);

      // ❌ remove quem já sigo
      data = data.filter((u) => !following.includes(u.id));

      // 🔥 embaralhar (random)
      data = data.sort(() => Math.random() - 0.5);

      // 🔥 limitar
      setUsers(data.slice(0, 5));
    };

    fetchUsers();
  }, [user, following]);

  // 🔥 fallback (caso não tenha ninguém)
  if (!users.length) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "#777" }}>
          Sem sugestões por enquanto 
        </p>
      </div>
    );
  }

  return (
  <div className="suggestions">

    <div className="suggestions-row">
      {users.map((u) => (
        <div key={u.id} className="suggestion-card">
          
          <img
            src={u.photoURL || "https://via.placeholder.com/60"}
            onClick={() => navigate(`/profile/${u.id}`)}
          />

          <p>{u.username || "Usuário"}</p>

          <button
            onClick={() => {
              if (following.includes(u.id)) {
                unfollowUser(user.uid, u.id);
              } else {
                followUser(
                  user,
                  u.id,
                  userData?.username || user.email
                );
              }
            }}
          >
            Seguir
          </button>

        </div>
      ))}
    </div>
  </div>
);
}