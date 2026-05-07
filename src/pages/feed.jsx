import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import {
  collection,
  orderBy,
  query,
  onSnapshot
} from "firebase/firestore";

import Post from "../components/Post";
import Suggestions from "../components/Suggestions";
import { listenFollowing } from "../services/followService";
import OnlineUsers from "../components/OnlineUsers";

import { useLocation } from "react-router-dom";
import "../styles/Feed.css";

function Feed() {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [feedItems, setFeedItems] = useState([]);

  const location = useLocation();

  // ✅ SÓ UMA VEZ
  const [selectedPost, setSelectedPost] = useState(null);

  // 🔥 abrir post vindo da notificação
  useEffect(() => {
    if (location.state?.openPostId && posts.length > 0) {
      const found = posts.find(
        (p) => p.id === location.state.openPostId
      );

      if (found) {
        setSelectedPost(found);
      } else {
        console.log("Post não encontrado no feed");
      }
    }
  }, [location.state, posts]);

  // 🔥 following
  useEffect(() => {
    if (!user) return;

    const unsub = listenFollowing(user.uid, (ids) => {
      setFollowing(ids);
    });

    return () => unsub();
  }, [user]);

  // 🔥 posts
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      lista = lista.filter(
        (p) =>
          p.userId === user.uid ||
          following.includes(p.userId)
      );

      setPosts(lista);
    });

    return () => unsub();
  }, [user, following]);

  // 🔥 montar feed
  useEffect(() => {
    const feed = [];

    posts.forEach((post, index) => {
      feed.push({ type: "post", data: post });

      if ((index + 1) % 4 === 0) {
        feed.push({ type: "suggestions" });
      }
    });

    setFeedItems(feed);
  }, [posts]);

  return (
    <div className="feed">

      {/* ONLINE */}
      <div className="feed-section">
        <div className="feed-header">
          <span>Amigos online</span>
        </div>
        <OnlineUsers />
      </div>

      {/* SUGESTÕES */}
      <div className="feed-section">
        <div className="feed-header">
          <span>Sugestões para você</span>
        </div>
        <Suggestions />
      </div>

      {/* POSTS */}
      {feedItems.map((item, index) => {
        if (item.type === "post") {
          return (
            <div key={item.data.id} className="feed-post">
              <Post
                post={item.data}
                onClick={() => setSelectedPost(item.data)}
              />
            </div>
          );
        }

        if (item.type === "suggestions") {
          return (
            <div key={index} className="feed-section">
              <Suggestions />
            </div>
          );
        }

        return null;
      })}

      {/* 🔥 MODAL */}
      {selectedPost && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <Post post={selectedPost} variant="modal" />
          </div>
        </div>
      )}

    </div>
  );
}

export default Feed;