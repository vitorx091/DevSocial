import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  // 🔥 conta salva local
  useEffect(() => {
    const savedEmail = localStorage.getItem("lastEmail");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");

    if (!email || !senha) {
      setErro("Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      const sucesso = await login(email, senha);

      if (sucesso) {
        localStorage.setItem("lastEmail", email);
        navigate("/feed");
      } else {
        setErro("Email ou senha inválidos");
      }
    } catch (err) {
      setErro("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  function handleEmailChange(e) {
    const valor = e.target.value;
    setEmail(valor);

    if (!valor.includes("@") && valor.length > 0) {
      setSugestoes([
        valor + "@gmail.com",
        valor + "@outlook.com",
        valor + "@hotmail.com",
      ]);
    } else {
      setSugestoes([]);
    }
  }

  function aplicarSugestao(valor) {
    setEmail(valor);
    setSugestoes([]);
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="logo">DevConnect</h1>

        <form onSubmit={handleLogin}>
          {/* EMAIL */}
          <div className="input-group">
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={handleEmailChange}
              className="input"
            />

            {sugestoes.length > 0 && (
              <div className="sugestoes">
                {sugestoes.map((sugestao, index) => (
                  <div
                    key={index}
                    onClick={() => aplicarSugestao(sugestao)}
                    className="sugestao-item"
                  >
                    {sugestao}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SENHA */}
          <div className="senha-container">
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input"
            />

            <span
              className="toggle"
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </span>
          </div>

          {/* ERRO */}
          {erro && <p className="erro">{erro}</p>}

          {/* BOTÃO */}
          <button
            type="submit"
            className="button"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <div className="register-box">
        <p>
          Não tem conta?{" "}
          <span onClick={() => navigate("/register")}>
            Cadastre-se
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;