import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/register.css";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [bio, setBio] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleFoto = (e) => {
    const file = e.target.files[0];

    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErro("");

    if (!email || !username || !senha) {
      setErro("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);

    const sucesso = await register({
      username,
      email,
      senha,
      bio,
      foto,
    });

    setLoading(false);

    if (sucesso) {
      navigate("/feed");
    } else {
      setErro("Erro ao cadastrar");
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h1 className="logo">DevSocial</h1>

        <form className="form-register" onSubmit={handleRegister}>
          {/* FOTO */}
          <div className="foto-upload">
            <label>
              {preview ? (
                <img src={preview} alt="preview" className="foto-preview" />
              ) : (
                <div className="foto-placeholder">+</div>
              )}
              <input type="file" hidden onChange={handleFoto} />
            </label>
          </div>

          {/* USERNAME */}
          <input
            className="input"
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* EMAIL */}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* SENHA */}
          <input
            className="input"
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {/* BIO */}
          <textarea
            className="input"
            placeholder="Bio (opcional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          {erro && <p className="erro">{erro}</p>}

          <button className="button" disabled={loading}>
            {loading ? "Criando..." : "Cadastrar"}
          </button>
        </form>
      </div>

      <div className="register-footer">
        <p>
          Já tem conta?{" "}
          <span onClick={() => navigate("/")}>
            Entrar
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;