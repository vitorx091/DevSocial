import { db } from "../firebase";
import { collection, addDoc, getDocs , query, orderBy } from "firebase/firestore";

const postRef = collection(db, "posts");

export const creatPost = async (data) => {
    return await addDoc(postRef, data);
};

export const getPosts = async () => {
    const q =query(postRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id:doc.id,
        ...doc.data()
    }));
};