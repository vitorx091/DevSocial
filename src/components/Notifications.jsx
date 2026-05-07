import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus
} from "lucide-react";

import "../styles/notifications.css";

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [usersMap, setUsersMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const [lastNotification, setLastNotitification] = useState(null);

  const getUserName = (user) => {
    return user?.username || user?.email?.split("@")[0] || "Usuário";
  };

  // 🔥 pegar users das notificações
  useEffect(() => {
    const fetchUsers = async () => {
      const newMap = {};

      for (const n of notifications) {
        const ids = n.users?.length ? n.users : [n.fromUserId];

        for (const uid of ids) {
          if (!newMap[uid]) {
            const ref = doc(db, "users", uid);
            const snap = await getDoc(ref);

            if (snap.exists()) {
              newMap[uid] = snap.data();
            }
          }
        }
      }

      setUsersMap(newMap);
    };

    if (notifications.length > 0) {
      fetchUsers();
    }
  }, [notifications]);

  // 🔥 realtime notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(data);

      if (data.length > 0) {
        setLastNotitification(data[0]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 🔥 marcar como lidas
  const markAllAsRead = async () => {
    if (!user) return;

    const snapshot = await getDocs(
      collection(db, "users", user.uid, "notifications")
    );

    snapshot.forEach(async (docItem) => {
      await updateDoc(docItem.ref, { read: true });
    });
  };

  // 🔥 abrir painel
  const handleOpen = () => {
    setIsOpen(true);
    markAllAsRead();
  };

  // 🔥 render mensagem com ícone IG
  const renderMessage = (n, user) => {
    const name = getUserName(user);

    if (n.type === "follow") {
      return (
        <>
          <UserPlus size={16} /> {name} começou a te seguir
        </>
      );
    }

    if (n.type === "like") {
      const count = n.users?.length || 1;

      return (
        <>
          <Heart size={16} />
          {count === 1
            ? ` ${name} curtiu seu post`
            : ` ${name} e mais ${count - 1} pessoas curtiram seu post`}
        </>
      );
    }

    if (n.type === "comment") {
      return (
        <>
          <MessageCircle size={16} /> {name}: {n.text}
        </>
      );
    }

    return "Nova notificação";
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  return (
    <div
      className={`notifications ${isOpen ? "open" : ""}`}
      onMouseEnter={handleOpen}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* HEADER */}
      <div className="notifications-header">
        <Bell size={20} />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </div>

      {/* LISTA */}
      {isOpen && (
        <div className="notifications-list">
          {notifications.length === 0 && (
            <p className="empty">Nenhuma notificação</p>
          )}

          {notifications.map((n) => {
            const mainUserId = n.lastUserId || n.fromUserId;
            const user = usersMap[mainUserId] || {};
            const photo = user.photoURL || "https://i.pravatar.cc/40";

            return (
              <div
                key={n.id}
                className={`notification-item ${!n.read ? "unread" : ""}`}
                onClick={() => {
                  switch (n.type) {
                    case "follow":
                      navigate(`/profile/${n.lastUserId || n.fromUserId}`);
                      break;

                    case "like":
                    case "comment":
                      if (n.postId) {
                        navigate("/feed", {
                          state: { openPostId: n.postId }
                        });
                      }
                      break;

                    default:
                      break;
                  }
                }}
              >
                <img src={photo} alt="user" />

                <p>{renderMessage(n, user)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}