import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const searchUsers = async (searchTerm, currentUserId) => {
  if (!searchTerm) return [];

  const clean = searchTerm.toLowerCase().trim();
  const usersRef = collection(db, "users");

  const qUsername = query(
    usersRef,
    where("username", ">=", clean),
    where("username", "<=", clean + "\uf8ff")
  );

  const qEmail = query(
    usersRef,
    where("email", ">=", clean),
    where("email", "<=", clean + "\uf8ff")
  );

  const [snap1, snap2] = await Promise.all([
    getDocs(qUsername),
    getDocs(qEmail),
  ]);

  const users = [
    ...snap1.docs.map((d) => ({ id: d.id, ...d.data() })),
    ...snap2.docs.map((d) => ({ id: d.id, ...d.data() })),
  ].filter(
    (u, i, arr) =>
      u.id !== currentUserId &&
      i === arr.findIndex((x) => x.id === u.id)
  );

  return users;
};