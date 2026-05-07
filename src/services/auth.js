import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword
} from "firebase/auth";

export const loginUser = (email, senha) => {
  return signInWithEmailAndPassword(auth, email, senha);
};

export const registerUser = (email, senha) => {
  return createUserWithEmailAndPassword(auth, email, senha);
}; 

export const logoutUser = () => {
  return signOut(auth);
};
