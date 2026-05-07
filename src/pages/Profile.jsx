import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Cropper from "react-easy-crop";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import {
  collection,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  followUser,
  unfollowUser,
  listenFollowing
} from "../services/followService";

import "../styles/Profile.css";
import Post from "../components/Post";

function Profile() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const resolvedId = id || user?.uid;
  const isMyProfile = resolvedId === user?.uid;

  const [posts, setPosts] = useState([]);
  const [userData, setUserData] = useState(null);

  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [myFollowing, setMyFollowing] = useState([]);

  const [followModal, setFollowModal] = useState({
    open: false,
    type: null
  });

  const [followUsers, setFollowUsers] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);

  // FOLLOW REALTIME
  useEffect(() => {
    if (!user) return;
    const unsub = listenFollowing(user.uid, setMyFollowing);
    return () => unsub();
  }, [user]);

  // FOLLOWERS
  useEffect(() => {
    if (!resolvedId) return;

    const ref = collection(db, "users", resolvedId, "followers");

    const unsub = onSnapshot(ref, (snap) => {
      setFollowers(snap.docs.map((d) => d.id));
    });

    return () => unsub();
  }, [resolvedId]);

  // FOLLOWING
  useEffect(() => {
    if (!resolvedId) return;

    const ref = collection(db, "users", resolvedId, "following");

    const unsub = onSnapshot(ref, (snap) => {
      setFollowing(snap.docs.map((d) => d.id));
    });

    return () => unsub();
  }, [resolvedId]);

  // LOAD USER + POSTS
  useEffect(() => {
    if (!user) return; // 🔥 ESPERA O USER



    if (!resolvedId) return;

    const loadUser = async () => {
      const snap = await getDoc(doc(db, "users", resolvedId));
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setBio(data.bio || "");
        setUsername(data.username || "");
      } else {
        setUserData(null); // evita fantasma
      }
    };

    loadUser();

    const q = query(
      collection(db, "posts"),
      where("userId", "==", resolvedId)
    );

    const unsub = onSnapshot(q, (snap) => {
      setPosts(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    });

    return () => unsub();
  }, [id, user]);

  useEffect(() => {
    if (!followModal.open) return;

    const ids =
      followModal.type === "followers"
        ? followers
        : following;

    const load = async () => {
      const list = [];

      for (const uid of ids) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          list.push({ id: uid, ...snap.data() });
        }
      }
      setFollowUsers(list);
    };
    load();
  }, [followModal, followers, following]);

  // CROP
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // UPDATE PROFILE
  const handleUpdateProfile = async () => {
    let photoURL = userData?.photoURL || "";

    if (file) {
      let fileToUpload = file;

      if (croppedArea) {
        const image = new Image();
        image.src = preview;

        await new Promise((r) => (image.onload = r));

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = croppedArea.width;
        canvas.height = croppedArea.height;

        ctx.drawImage(
          image,
          croppedArea.x,
          croppedArea.y,
          croppedArea.width,
          croppedArea.height,
          0,
          0,
          croppedArea.width,
          croppedArea.height
        );

        fileToUpload = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg")
        );
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("upload_preset", "ml_default");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dwqktii42/image/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await res.json();
      photoURL = data.secure_url;
    }

    await updateDoc(doc(db, "users", user.uid), {
      username,
      bio,
      photoURL
    });

    setEditMode(false);
    setIsPhotoModalOpen(false);
    setFile(null);
    setPreview(null);
  };

  // 🔥 NOVO: MENSAGEM
  const handleMessage = async () => {
    const chatId = [user.uid, resolvedId].sort().join("_");

    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [user.uid, resolvedId],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    navigate(`/messages/${resolvedId}`);
  };

  const isFollowingReal = myFollowing.includes(resolvedId);

  //admin
  const ADMIN_ID = "ucaUX2SswbXenVP29UBym2ME4073"
  const isAdminProfile = resolvedId === ADMIN_ID;


  return (
    <div className="profile-container">

      <div className="profile-header">

        <div className="profile-avatar-wrapper">
          <img
            src={userData?.photoURL || "https://via.placeholder.com/150"}
            className="profile-avatar"
            onClick={() => isMyProfile && setIsPhotoModalOpen(true)}
          />
        </div>

        <div className="profile-info">

          <div className="profile-stats">
            <span><strong>{posts.length}</strong> posts</span>
            <span onClick={() => setFollowModal({ open: true, type: "followers" })}>
              <strong>{followers.length}</strong> seguidores
            </span>
            <span onClick={() => setFollowModal({ open: true, type: "following" })}>
              <strong>{following.length}</strong> seguindo
            </span>
          </div>

          <div className="profile-bio">
            {editMode ? (
              <>
                <input
                  className="inline-edit-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <textarea
                  className="inline-edit-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />

                <button onClick={handleUpdateProfile}>
                  Salvar
                </button>
              </>
            ) : (
              <>
                <span className="name">{username}</span>
                <span>{bio || "Sem bio"}</span>
              </>
            )}
          </div>

          <div className="profile-top">
            <h2>{userData?.username || "sem nome"}</h2>

            {isMyProfile ? (
              <button
                onClick={() => setEditMode(!editMode)}
                className="edit-btn"
              >
                Editar perfil
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="follow-btn"
                  onClick={() =>
                    isFollowingReal
                      ? unfollowUser(user.uid, resolvedId)
                      : followUser(user, resolvedId)
                  }
                >
                  {isFollowingReal ? "Seguindo" : "Seguir"}
                </button>

                <button
                  className="message-btn"
                  onClick={handleMessage}
                >
                  Mensagem
                </button>
                {isAdminProfile && (
                  <a
                    href="/Curriculo-joao-vitor-fidelis.pdf"
                    download
                    className="download-cv-btn"
                  >
                    Currículo
                  </a>
                )}
              </div>
            )}
          </div>



        </div>
      </div>

      {/* GRID POSTS */}
      <div className="profile-grid">
        {posts.map((post) => (
          <div key={post.id} onClick={() => setSelectedPost(post)}>
            <Post post={post} variant="grid" />
          </div>
        ))}
      </div>

      {/* MODAL POST */}
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

      {/* MODAL FOLLOW */}
      {followModal.open && (
        <div
          className="follow-overlay"
          onClick={() => setFollowModal({ open: false })}
        >
          <div
            className="follow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {followModal.type === "followers"
                ? "Seguidores"
                : "Seguindo"}
            </h3>

            {followUsers.map((u) => (
              <div
                key={u.id}
                className="follow-user"
                onClick={() => navigate(`/profile/${u.id}`)}
              >
                <img src={u.photoURL || "https://via.placeholder.com/50"} />
                <div>
                  <strong>{u.username || "Sem nome"}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

 {/* 🔥 MODAL TROCAR FOTO */}
{isPhotoModalOpen && (
  <div
    className="photo-modal-overlay"
    onClick={() => setIsPhotoModalOpen(false)}
  >

    <div
      className="photo-modal"
      onClick={(e) => e.stopPropagation()}

      onDrop={(e) => {
        e.preventDefault();

        const droppedFile = e.dataTransfer.files[0];

        if (!droppedFile) return;

        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
      }}

      onDragOver={(e) => e.preventDefault()}
    >

      <input
        id="upload-photo"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: "none" }}
      />

      {!preview && (
        <label
          htmlFor="upload-photo"
          className="photo-drop-area"
        >

          <div className="photo-upload-content">

            <img
              src={
                userData?.photoURL ||
                "https://via.placeholder.com/150"
              }
              alt="preview"
              className="photo-preview-avatar"
            />

            <div className="photo-upload-text">
              <strong>Arraste sua foto aqui</strong>
              <span>ou clique para selecionar</span>
            </div>

          </div>

        </label>
      )}

      {preview && (
        <div className="crop-container">
          <Cropper
            image={preview}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}

      <div className="photo-bottom-bar">
        <button
          className="save-btn"
          onClick={handleUpdateProfile}
        >
          Salvar
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );
}

export default Profile;