import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/search.css"

export default function Search() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);

  const navigate = useNavigate();

  // 🔥 carregar histórico
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("recentSearch")) || [];
    setRecent(saved);
  }, []);

  // 🔎 busca automática
  useEffect(() => {
    if (!term) {
      setResults([]);
      return;
    }

    const search = async () => {
      const q = query(
        collection(db, "users"),
        where("username", ">=", term),
        where("username", "<=", term + "\uf8ff"),
        limit(5)
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setResults(data);
    };

    search();
  }, [term]);

  // 💾 salvar histórico
  const saveRecent = (user) => {
    let updated = [user, ...recent.filter((u) => u.id !== user.id)];
    updated = updated.slice(0, 5);

    setRecent(updated);
    localStorage.setItem("recentSearch", JSON.stringify(updated));
  };

  return (
  <div className="search-container">

    <input
      className="search-input"
      placeholder="Buscar"
      value={term}
      onChange={(e) => setTerm(e.target.value)}
    />

    {((term && results.length > 0) || (!term && recent.length > 0)) && (
      <div className="search-dropdown">

        {/* RESULTADOS */}
        {term &&
          results.map((user) => (
            <div
              key={user.id}
              className="search-item"
              onClick={() => {
                saveRecent(user);
                navigate(`/profile/${user.id}`);
              }}
            >
              <img src={user.photoURL || "https://via.placeholder.com/40"} />

              <div>
                <strong>{user.username}</strong>
                <p>{user.email}</p>
              </div>
            </div>
          ))}

        {/* HISTÓRICO */}
        {!term && recent.length > 0 && (
          <>
            <div className="search-title">Recentes</div>

            {recent.map((user) => (
              <div
                key={user.id}
                className="search-item"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <img src={user.photoURL || "https://via.placeholder.com/40"} />

                <div>
                  <strong>{user.username}</strong>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    )}

  </div>
);
}