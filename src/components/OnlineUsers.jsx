import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import "../styles/OnlineUsers.css"

export default function OnlineUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));

      const now = Date.now();

      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ❌ remove eu
      data = data.filter((u) => u.id !== user.uid);

      // 🟢 filtra online (2 min)
      data = data.filter(
        (u) => now - (u.lastActive || 0) < 120000
      );

      setUsers(data);
    };

    fetchUsers();
  }, [user]);

  if (!users.length) return null;

  return (
    <div className="online-bar">
      {users.map((u) => (
        <div
          key={u.id}
          className="online-user"
          onClick={() => navigate(`/profile/${u.id}`)}
        >
          <div className="avatar-wrapper">
            <img src={u.photoURL || "https://via.placeholder.com/60"} />
            <span className="online-dot" />
          </div>

          <p>{u.username}</p>
        </div>
      ))}
    </div>
  );
}