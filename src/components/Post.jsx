import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  deleteDoc,
  addDoc,
  collection,
  onSnapshot,
  setDoc,
  query,
  orderBy
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { createNotification } from "../services/NotificationService";
import { Heart, MessageCircle } from "lucide-react";
import "../styles/post.css";

export default function Post({ post, variant, onClick }) {
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  const [likes, setLikes] = useState([]);
  const [liked, setLiked] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [startX, setStartX] = useState(0);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [expanded, setExpanded] = useState(false);

  // ================= LIKE =================
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "posts", post.id, "likes");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const ids = snapshot.docs.map((doc) => doc.id);
      setLikes(ids);
      setLiked(ids.includes(user.uid));
    });

    return () => unsubscribe();
  }, [post.id, user]);

  const handleLike = async () => {
    if (!user) return;

    const ref = doc(db, "posts", post.id, "likes", user.uid);

    if (liked) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { createdAt: new Date() });

      if (post.userId !== user.uid) {
        await createNotification({
          toUserId: post.userId,
          fromUserId: user.uid,
          fromUsername: userData?.username || "Usuário",
          type: "like",
          postId: post.id
        });
      }
    }
  };

  // ================= IMAGES =================
  const images = post?.imageUrls?.length
    ? post.imageUrls
    : post?.imageUrl
      ? [post.imageUrl]
      : [];

  const preview =
    post?.imageUrls?.[0] ||
    post?.imageUrl ||
    post?.["image URL"];

  // ================= COMMENTS =================
  useEffect(() => {
    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [post.id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment || !user) return;

    await addDoc(collection(db, "posts", post.id, "comments"), {
      text: newComment,
      userId: user.uid,
      username: userData?.username || "Usuário",
      photoURL: userData?.photoURL || null,
      createdAt: new Date(),
    });

    setNewComment("");
  };

  const safeClick = () => {
    if (typeof onClick === "function") {
      onClick();
    }
  };

  // ================= GRID =================
  if (variant === "grid") {
    return (
      <div className="post-item" onClick={safeClick}>
        <img src={preview} alt="post" />
        <div className="post-overlay">
          <span>❤️ {likes.length}</span>
          <span>💬 {comments.length}</span>
        </div>
      </div>
    );
  }

  // ================= MODAL =================
  if (variant === "modal") {
    return (
      <div className="post-modal-info">

        {/* LEFT */}
        <div className="modal-left">
          {images.length > 0 && (
            <div className="carousel">

              <div
                className="carousel-track"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                }}
              >
                {images.map((img, index) => (
                  <img key={index} src={img} alt="post" />
                ))}
              </div>

              {images.length > 1 && (
                <>
                  <button
                    className="carousel-btn left"
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        prev === 0 ? images.length - 1 : prev - 1
                      )
                    }
                  >
                    ‹
                  </button>

                  <button
                    className="carousel-btn right"
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        prev === images.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="modal-right">

          {/* HEADER */}
          <div className="post-user">
            <img src={post?.photoURL || "/default-avatar.png"} />
            <strong>{post?.username}</strong>
          </div>

          {(post?.text || post?.description || post?.descricao) && (
            <div className="post-text-wrapper">

              <p className={`post-text ${!expanded ? "clamp" : ""}`}>
                <strong>Descrição: </strong>
                {post.text || post.description || post.descricao}
              </p>

              {(post.text || post.description || post.descricao).length > 100 && (
                <span
                  className="expand-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((prev) => !prev);
                  }}
                >
                  {expanded ? "ver menos" : "ver mais"}
                </span>
              )}

            </div>
          )}

          {/* COMMENTS */}
          <div className="post-comments">

            {comments.length === 0 ? (
              <p className="no-comments">Nenhum comentário ainda</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="comment"
                  onClick={() => navigate("/feed", {
                    state: { openPostId: n.postId }
                  })}
                  style={{ cursor: "pointer" }}
                >

                  <img
                    src={
                      c.photoURL ||
                      `https://ui-avatars.com/api/?name=${c.username}&background=random`
                    }
                    alt={c.username}
                  />

                  <div>
                    <strong>{c.username}</strong>
                    <span>{c.text}</span>
                  </div>

                </div>
              ))
            )}

          </div>

          {/* ACTIONS */}
          <div className="post-actions">
            <button onClick={handleLike}>
              {liked ? (
                <Heart fill="red" color="red" size={22} />
              ) : (
                <Heart size={22} />
              )}
              <span>{likes.length}</span>
            </button>

            <form onSubmit={handleComment}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Comentar..."
              />
              <button type="submit">Enviar</button>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // ================= FEED =================
  return (
    <div className="post">

      <div
        className="post-header"
        onClick={() => navigate("/feed", {
          state: {
            openPostId: n.postId
          }
        })}
      >
        <div className="post-user-info">
          <img src={post?.photoURL || "/default-avatar.png"} />
          <strong>{post?.username}</strong>
        </div>
      </div>

      {images.length > 0 && (
        <div
          className="carousel"
          onClick={safeClick}
          onTouchStart={(e) => setStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const endX = e.changedTouches[0].clientX;

            if (startX - endX > 50) {
              setCurrentIndex((p) =>
                p === images.length - 1 ? 0 : p + 1
              );
            }

            if (endX - startX > 50) {
              setCurrentIndex((p) =>
                p === 0 ? images.length - 1 : p - 1
              );
            }
          }}
        >
          <div
            className="carousel-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((img, i) => (
              <img key={i} src={img} />
            ))}
          </div>

          {images.length > 1 && (
            <>
              <button
                className="carousel-btn left"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((p) =>
                    p === 0 ? images.length - 1 : p - 1
                  );
                }}
              >
                ‹
              </button>

              <button
                className="carousel-btn right"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((p) =>
                    p === images.length - 1 ? 0 : p + 1
                  );
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}

      {/* ACTIONS */}
      <div className="post-actions-bar">

        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Heart fill={liked ? "red" : "none"} size={24} />
            <span>{likes.length}</span>
          </div>
        </button>

        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            safeClick();
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <MessageCircle size={24} />
            <span>{comments.length}</span>
          </div>
        </button>

      </div>

      <p className="likes-count">{likes.length} curtidas</p>

      {(post?.text || post?.description || post?.descricao) && (
        <div className="post-text-wrapper">

          <p className={`post-text ${!expanded ? "clamp" : ""}`}>
            <strong>Descrição: </strong>
            {post.text || post.description || post.descricao}
          </p>

          {(post.text || post.description || post.descricao).length > 100 && (
                <span
                  className="expand-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((prev) => !prev);
                  }}
                >
                  {expanded ? "ver menos" : "ver mais"}
                </span>
              )}

        </div>
      )}

      {comments.length > 0 && (
        <p className="last-comment" onClick={safeClick}>
          <strong>{comments[comments.length - 1].username}</strong>{" "}
          {comments[comments.length - 1].text}
        </p>
      )}

      <form
        className="comment-form"
        onSubmit={(e) => {
          e.stopPropagation();
          handleComment(e);
        }}
      >
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Comentar..."
        />
        <button type="submit">Publicar</button>
      </form>

    </div>
  );
}