import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import "../styles/createPost.css";

function CreatePost() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const [descricao, setDescricao] = useState("");
  const [imagens, setImagens] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState(1);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 0) {
      setImagens(files);
      setCurrentIndex(0);
      setStep(2);
    }
  };

  // 🔥 DRAG AND DROP
  const handleDrop = (e) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      setImagens(files);
      setCurrentIndex(0);
      setStep(2);
    }
  };

  const handlePost = async () => {
    let imageUrls = [];

    for (let img of imagens) {
      const formData = new FormData();
      formData.append("file", img);
      formData.append("upload_preset", "ml_default");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dwqktii42/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.secure_url) {
        imageUrls.push(data.secure_url);
      }
    }

    await addDoc(collection(db, "posts"), {
      descricao,
      username: userData?.username || "Usuário",
      photoURL: userData?.photoURL || "",
      userId: user.uid,
      imageUrls,
      createdAt: new Date(),
    });

    setImagens([]);
    setCurrentIndex(0);
    setDescricao("");
    setStep(1);

    navigate("/feed");
  };

  return (
    <div className="ig-create-overlay">

      <div className="ig-create-modal">

        {/* HEADER */}
        <div className="ig-header">
          <button onClick={() => navigate("/feed")}>Cancelar</button>

          <span>Criar novo post</span>

          {step === 2 && (
            <button onClick={handlePost}>Compartilhar</button>
          )}
        </div>

        {/* STEP 1 - ESCOLHER */}
        {step === 1 && (
          <div
            className="ig-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />

            <p>Arraste fotos ou selecione do dispositivo</p>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="ig-body">

            {/* IMAGENS */}
            <div className="ig-preview">
              <img
                src={URL.createObjectURL(imagens[currentIndex])}
                alt="preview"
              />

              {/* SETAS */}
              {imagens.length > 1 && (
                <div className="ig-arrows">
                  <button
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        prev === 0 ? imagens.length - 1 : prev - 1
                      )
                    }
                  >
                    ◀️
                  </button>

                  <button
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        prev === imagens.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    ▶️
                  </button>
                </div>
              )}
            </div>

            {/* THUMBS */}
            <div className="ig-thumbs">
              {imagens.map((img, index) => (
                <img
                  key={index}
                  src={URL.createObjectURL(img)}
                  className={index === currentIndex ? "active" : ""}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>

            {/* LADO DIREITO */}
            <div className="ig-side">

              <div className="ig-user">
                <img src={userData?.photoURL} />
                <strong>{userData?.username}</strong>
              </div>

              <textarea
                placeholder="Escreva uma legenda..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />

              <button
                className="ig-change"
                onClick={() => {
                  setStep(1);
                  setImagens([]);
                  setCurrentIndex(0);
                }}
              >
                Trocar imagem
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default CreatePost;