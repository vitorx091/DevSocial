import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion
} from "firebase/firestore";

export async function createNotification({
  toUserId,
  fromUserId,
  fromUsername,
  type,
  postId = null,
  text = null,
}) {
  if (!toUserId || !fromUserId) return;
  if (toUserId === fromUserId) return;

  // 🔥 LIKE = AGRUPADA
  if (type === "like" && postId) {
    const notiRef = doc(
      db,
      "users",
      toUserId,
      "notifications",
      `like_${postId}`
    );

    const snap = await getDoc(notiRef);

    if (snap.exists()) {
      await updateDoc(notiRef, {
        users: arrayUnion(fromUserId),
        lastUserId: fromUserId,
        createdAt: Date.now(),
        read: false
      });
    } else {
      await setDoc(notiRef, {
        type: "like",
        postId,
        users: [fromUserId],
        lastUserId: fromUserId,
        createdAt: Date.now(),
        read: false
      });
    }

    return; // 🔥 MUITO IMPORTANTE (evita duplicar)
  }

  // 🔥 RESTO NORMAL (comment, follow)
  await addDoc(
    collection(db, "users", toUserId, "notifications"),
    {
      fromUserId,
      fromUsername: fromUsername || "Usuário",
      type,
      postId,
      text,
      read: false,
      createdAt: Date.now(),
    }
  );
}