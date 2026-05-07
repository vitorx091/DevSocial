import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { searchUsers } from "../services/userService";

export default function UserSearch() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      const users = await searchUsers(searchTerm, user.uid);
      setResults(users);
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm, user.uid]);

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Buscar usuários..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="search-results">
        {results.map((u) => (
          <Link key={u.id} to={`/messages/${u.id}`}>
            <p>{u.username}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}