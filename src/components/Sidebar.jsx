import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

import {
  Home,
  User,
  MessageCircle,
  PlusSquare,
  Search,
  LogOut,
  Shield
} from "lucide-react";

import "../styles/Sideber.css";
import { use } from "react";

export default function Sidebar({ user }) {
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // 🔥 badge
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState (false);

  


  useEffect (()=> {
    if(!user) return;

    const ref = doc(db, "users", user.uid);

    const unsub = onSnapshot(ref, (snap) =>{
      setIsAdmin(snap.data()?.isAdmin === true);
    });
    return ()=> unsub();
  }, [user]);
  
  const ADMIN_ID = "ucaUX2SswbXenVP29UBym2ME4073";
  const profileId = isAdmin
  ? ADMIN_ID : user?.uid;
  // ============================
  // 🔥 NOTIFICAÇÕES DE MENSAGEM
  // ============================


useEffect(() => {
  if (!user) return;

  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", user.uid)
  );

  const unsub = onSnapshot(q, (snap) => {
    let unreadChats = 0;

    snap.docs.forEach((docSnap) => {
      const chat = docSnap.data();

      const lastMsg = chat.lastMessage;
      const lastRead = chat.lastRead?.[user.uid];

      // 🔥 REGRA CORRETA
      if (
        lastMsg &&
        lastMsg.senderId !== user.uid &&
        (
          !lastRead || 
          (lastMsg.timestamp && lastRead && lastMsg.timestamp.toMillis() > lastRead.toMillis())
        )
      ) {
        unreadChats++;
      }
    });

    setUnreadCount(unreadChats);
  });

  return () => unsub();
}, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div
      className={`sidebar ${expanded ? "expanded" : ""}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="sidebar-top">
        <h2 className="logo">{expanded ? "DevSocial" : "DS"}</h2>
      </div>

      <nav className="sidebar-nav">
        <Link to="/feed">
          <Home size={24} />
          {expanded && <span>Feed</span>}
        </Link>

        <Link to={`/profile/${profileId}`}>
          <User size={24} />
          {expanded && <span>Perfil</span>}
        </Link>

        {/* 🔥 MENSAGENS COM BADGE */}
        <Link to="/messages" className="msg-link">
          <div className="icon-wrapper">
            <MessageCircle size={24} />

            {unreadCount > 0 && (
              <span className="msg-badge-dot">
                {unreadCount}
              </span>
            )}
          </div>

          {expanded && <span>Mensagens</span>}
        </Link>

        <Link to="/create">
          <PlusSquare size={24} />
          {expanded && <span>Criar</span>}
        </Link>

        <Link to="/search">
          <Search size={24} />
          {expanded && <span>Buscar</span>}
        </Link>

        {ADMIN_ID && (
          <Link to={`/profile/${ADMIN_ID}`}>
            <Shield size={24} />
            {expanded && <span>Admin/Portfólio</span>}
          </Link>
        )}
      </nav>

      <div className="sidebar-bottom">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={24} />
          {expanded && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}