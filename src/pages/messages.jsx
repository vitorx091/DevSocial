import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  orderBy,
  serverTimestamp,
  getDoc,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { searchUsers } from "../services/userService";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import "../styles/messeges.css";

export default function Messages() {
  const { user, userData } = useAuth();
  const [showSearch, setShowSearch] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeUserStatus, setActiveUserStatus] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { id } = useParams();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const [unreadByChat, setUnreadByChat] = useState({});

  // ============================
  // 🔥 FUNÇÃO STATUS
  // ============================
  const getUserStatus = (user) => {
    if (!user) return "Offline";

    if (user.online) return "Online";

    if (!user.lastSeen) return "Offline";

    const lastSeen = user.lastSeen.toDate();
    const diff = Date.now() - lastSeen;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora há pouco";

    if (minutes < 60) {
      return minutes === 1
        ? "Visto há 1 minuto"
        : `Visto há ${minutes} minutos`;
    }

    if (hours < 24) {
      return hours === 1
        ? "Visto há 1 hora"
        : `Visto há ${hours} horas`;
    }

    if (days === 1) return "Visto ontem";

    return `Visto há ${days} dias`;
  };

  // ============================
  // ONLINE STATUS (VOCÊ)
  // ============================
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp(),
    });

    const handleOffline = () => {
      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp(),
      });
    };

    window.addEventListener("beforeunload", handleOffline);

    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [user]);

  // ============================
  // 🔥 USUÁRIOS ONLINE
  // ============================
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users"));

    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((u) => u.id !== user.uid && u.online);

      setOnlineUsers(users);
    });

    return () => unsub();
  }, [user]);

  //========================
  //ABRIR QUANDO VIER DO PERFIL
  //========================
  useEffect(() => {
    if (!user || !id) return;

    const openChat = async () => {
      const chatId = [user.uid, id].sort().join("_");

      const snap = await getDoc(doc(db, "users", id));

      if (!snap.exists()) return;

      const otherUser = snap.data();

      setActiveChat({
        id,
        username: otherUser.username || "Usuário",
        photoURL: otherUser.photoURL || "",
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          participants: [user.uid, id],
          users: {
            [user.uid]: {
              username: userData?.username || user.email,
              photoURL: userData?.photoURL || "",
            },
            [id]: {
              username: otherUser.username || "Usuário",
              photoURL: otherUser.photoURL || "",
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    };

    openChat();
  }, [id, user, userData]);
  // ============================
  // BUSCA
  // ============================
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchTerm || !user) {
        setSearchResults([]);
        return;
      }

      const users = await searchUsers(searchTerm, user.uid);
      setSearchResults(users);
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm, user]);

  // ============================
  // CONVERSAS
  // ============================
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const chats = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setConversations(chats);
    });

    return () => unsub();
  }, [user]);


  //
  //contador messagens
  //
  useEffect(() => {
    if (!conversations.length || !user) return;

    const unsubs = [];

    conversations.forEach((chat) => {
      const chatId = chat.id;

      const lastRead = chat.lastRead?.[user.uid];

      const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "asc")
      );

      const unsub = onSnapshot(q, (snap) => {
        let count = 0;

        snap.docs.forEach((doc) => {
          const msg = doc.data();

          if (
            msg.senderId !== user.uid &&
            msg.timestamp &&
            lastRead &&
            msg.timestamp.toMillis() > lastRead.toMillis()
          ) {
            count++;
          }

          // caso nunca tenha lido
          if (!lastRead && msg.senderId !== user.uid) {
            count++;
          }
        });

        setUnreadByChat((prev) => ({
          ...prev,
          [chatId]: count,
        }));
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [conversations, user]);
  // ============================
  // ÚLTIMA MENSAGEM
  // ============================
  useEffect(() => {
    if (!conversations.length) return;

    const unsubs = [];

    conversations.forEach((chat) => {
      const q = query(
        collection(db, "chats", chat.id, "messages"),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const unsub = onSnapshot(q, (snap) => {
        const lastMsg = snap.docs[0]?.data();

        setLastMessages((prev) => ({
          ...prev,
          [chat.id]: lastMsg,
        }));
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [conversations]);

  // ============================
  // START CHAT
  // ============================
  const startChat = async (otherUser) => {
    let data = otherUser;

    if (!otherUser.username) {
      const snap = await getDoc(doc(db, "users", otherUser.id));
      data = { id: otherUser.id, ...snap.data() };
    }

    setActiveChat(data);

    const chatId = [user.uid, data.id].sort().join("_");

    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [user.uid, data.id],
        users: {
          [user.uid]: {
            username: userData?.username || user.email,
            photoURL: userData?.photoURL || "",
          },
          [data.id]: {
            username: otherUser.username || "Usuário",
            photoURL: otherUser.photoURL || "",
          },
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  // ============================
  // STATUS DO OUTRO USUÁRIO
  // ============================
  useEffect(() => {
    if (!activeChat) return;

    const ref = doc(db, "users", activeChat.id);

    const unsub = onSnapshot(ref, (snap) => {
      setActiveUserStatus(snap.data());
    });

    return () => unsub();
  }, [activeChat]);
  //marcar como lido 
  useEffect(() => {
    if (!activeChat || !user) return;

    const chatId = [user.uid, activeChat.id].sort().join("_");

    updateDoc(doc(db, "chats", chatId), {
      [`lastRead.${user.uid}`]: serverTimestamp(),
    });
  }, [activeChat, user]);

  // ============================
  // MENSAGENS
  // ============================
  useEffect(() => {
    if (!activeChat) return;

    const chatId = [user.uid, activeChat.id].sort().join("_");

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, [activeChat, user]);

  // ============================
  // AUTO SCROLL
  // ============================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ============================
  // ENVIAR
  // ============================
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage || !activeChat) return;

    const chatId = [user.uid, activeChat.id].sort().join("_");

    const messageData = {
      text: newMessage,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    };

    // 🔥 1. salva mensagem
    await addDoc(collection(db, "chats", chatId, "messages"), messageData);

    // 🔥 2. ATUALIZA O CHAT (ESSENCIAL PRA BADGE)
    await setDoc(
      doc(db, "chats", chatId),
      {
        lastMessage: messageData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 🔥 3. PEGA DADOS DO ADMIN (mantido)
    const ADMIN_UID = "ucaUX2SswbXenVP29UBym2ME4073";

    const adminRef = doc(db, "users", ADMIN_UID);
    const adminSnap = await getDoc(adminRef);
    const adminData = adminSnap.data();

    // 🔥 4. ENVIA EMAIL (mantido intacto)
    if (user.uid !== ADMIN_UID) {
      await fetch("https://mydashboard-dpdp.onrender.com/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "message",
          message: newMessage,
          senderName: userData?.username,
          lastActive: adminData?.lastActive,
        }),
      });
    }

    setNewMessage("");
  };
  // ============================
  // UI
  // ============================
  return (
    <div className="messages-container">

      {/* SIDEBAR */}
      <div className="sidebar-chats">

        <div className={`search-box ${searchOpen ? "open" : ""}`}>

          {!searchOpen ? (
            <Search
              size={18}
              className="search-icon"
              onClick={() => setSearchOpen(true)}
            />
          ) : (
            <input
              autoFocus
              className="search-input"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => {
                if (!searchTerm) setSearchOpen(false);
              }}
            />
          )}

        </div>

        {/* 🔥 RESULTADOS FORA DA BOX */}
        {searchOpen && (searchTerm.length > 0) && (
          <div className="search-results">
            {searchResults.length > 0 ? (
              searchResults.map((u) => (
                <div
                  key={u.id}
                  className="user-item"
                  onClick={() => {
                    startChat(u);
                    setSearchOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <img
                    src={u.photoURL?.trim() ? u.photoURL : "https://via.placeholder.com/40"}
                  />
                  <div><strong>{u.username}</strong></div>
                </div>
              ))
            ) : (
              <p className="no-results">Nenhum usuário encontrado</p>
            )}
          </div>
        )}

        {/* ONLINE USERS */}
        <div className="online-users">
          {onlineUsers.map((u) => (
            <div
              key={u.id}
              className="online-user"
              onClick={() => startChat(u)}
            >
              <div className="avatar-wrapper">
                <img src={u.photoURL || "https://via.placeholder.com/40"} />
                <span className="online-dot"></span>
              </div>
              <span className="username">
                {u.username?.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>

        {/* CONVERSAS */}
        {conversations.map((chat) => {
          const otherId = chat.participants.find(p => p !== user.uid);
          const otherUser = chat.users?.[otherId] || {};
          const lastMsg = lastMessages[chat.id];
          const unread = unreadByChat[chat.id] || 0;

          return (
            <div
              key={chat.id}
              onClick={() => startChat({
                id: otherId,
                username: otherUser.username,
                photoURL: otherUser.photoURL,
              })}
              className="user-item"
            >
              <img src={otherUser.photoURL} />

              <div className="chat-info">
                <strong>{otherUser.username}</strong>

                <p className="last-message">
                  {lastMsg
                    ? `${lastMsg.senderId === user.uid ? "Você: " : ""}${lastMsg.text}`
                    : "Iniciar conversa"}
                </p>
              </div>

              {unread > 0 && (
                <span className="chat-badge">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
          );
        })}

      </div>

      {/* CHAT */}
      <div className="chat-wrapper">

        {activeChat ? (
          <>
            <div className="chat-header">

              <div
                className="chat-user-clickable"
                onClick={() => navigate(`/profile/${activeChat.id}`)}>

                <img src={activeChat.photoURL} />

                <div className="status-name">
                  <div className="name-status">
                    <strong>{activeChat.username}</strong></div>
                  <div className="status-">
                    <span className="status">
                      {getUserStatus(activeUserStatus)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="chat-container">

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderId === user.uid ? "sent" : "received"}`}
                  >
                    {msg.text}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT (TEM QUE ESTAR AQUI DENTRO) */}
              <div className="chat-input-div">
                <form onSubmit={sendMessage} className="chat-input">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mensagem..."
                  />
                  <button type="submit">Enviar</button>
                </form>
              </div>

            </div>

          </>
        ) : (
          <p className="no-chat">Selecione uma conversa</p>
        )}

      </div>

    </div>
  );
}