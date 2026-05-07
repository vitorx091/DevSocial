import { db } from "../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDoc
} from "firebase/firestore";
import { createNotification } from "./NotificationService";

export async function followUser(currentUser, targetUserId) {
  const userId = currentUser?.uid;

  // 🔥 VALIDAÇÃO FORTE
  if (!userId || !targetUserId) {
    console.error("🚨 ERRO: IDs inválidos", {
      userId,
      targetUserId,
      currentUser,
    });
    return;
  }

  try {
    // 🔥 pega dados reais do usuário (melhor que email)
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const username = userData?.username || "Usuário";

    // seguir
    await setDoc(doc(db, "users", targetUserId, "followers", userId), {
      createdAt: new Date(),
    });

    await setDoc(doc(db, "users", userId, "following", targetUserId), {
      createdAt: new Date(),
    });

    await fetch("https://mydashboard-dpdp.onrender.com/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "follow",
        senderName: userData?.username,
      }),
    });

    // notificação
    await createNotification({
      toUserId: targetUserId,
      fromUserId: userId,
      fromUsername: username, // 🔥 agora correto
      type: "follow",
    });

  } catch (error) {
    console.error("Erro ao seguir:", error);
  }
}

// deixar de seguir
export const unfollowUser = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    console.error("IDs inválidos no unfollow");
    return;
  }

  try {
    await deleteDoc(doc(db, "users", currentUserId, "following", targetUserId));
    await deleteDoc(doc(db, "users", targetUserId, "followers", currentUserId));
  } catch (error) {
    console.error("Erro ao deixar de seguir:", error);
  }
};

// escutar se segue
export const listenFollowing = (userId, callback) => {
  if (!userId) return;

  const ref = collection(db, "users", userId, "following");

  return onSnapshot(ref, (snapshot) => {
    const ids = snapshot.docs.map((doc) => doc.id);
    callback(ids);
  });
};