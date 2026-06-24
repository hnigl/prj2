import { useState } from "react";
import "./App.css";

const tabs = [
  { id: "ask", label: "Ask" },
  { id: "generate", label: "Generate" },
];

const API_URL = "http://localhost:4000";

function App() {
  const [tab, setTab] = useState("ask");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");

    try {
      const requestBody = {
        user_id: "frontend_user",
        timestamp: new Date().toISOString(),
        input_type: "text",
        text: trimmed,
      };

      const response = await fetch(`${API_URL}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json();
        const backendError = errData.error;
        const message = typeof backendError === 'string'
          ? backendError
          : JSON.stringify(backendError || errData.details || errData);
        throw new Error(message || "Backend error");
      }

      const data = await response.json();

      if (tab === "ask") {
        setHistory((current) => [
          ...current,
          { role: "user", text: trimmed },
          { role: "assistant", text: data.text || "No response" },
        ]);
      } else {
        setImagePrompt(trimmed);
        if (data.image_path) {
          setImagePath(`${API_URL}${data.image_path}`);
        }
      }

      setPrompt("");
    } catch (err) {
      setError(err.message || "Failed to connect to backend");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo" />

        <div className="nav-links">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "tab-button active" : "tab-button"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button type="button" className="login-btn">
          Log In
        </button>
      </header>

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow">AI voice & image assistant</p>
            <h1>Your voice, rendered into reality.</h1>
            <p className="hero-text">
              Transform your voice into stunning AI images or get instant answers.
              Switch between modes above to start.
            </p>
          </div>
        </section>

        <section className="panel">
          {tab === "ask" ? (
            <>
              <div className="panel-header">
                <h2>AI Chat Assistant</h2>
              </div>
              <div className="chat-box">
                {history.length === 0 ? (
                  <div className="message ai">
                    Ask me anything or tap the mic to speak...
                  </div>
                ) : (
                  history.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.role === "user" ? "user" : "ai"}`}
                    >
                      {message.text}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="panel-header">
                <h2>Text-to-Image / Voice-to-Image</h2>
              </div>
              <div className="image-placeholder">
                {imagePath ? (
                  <div>
                    <img
                      src={imagePath}
                      alt="Generated"
                      style={{ maxWidth: "100%", borderRadius: "8px" }}
                    />
                  </div>
                ) : imagePrompt ? (
                  <div>
                    <p className="placeholder-label">Prompt preview</p>
                    <p className="image-caption">{imagePrompt}</p>
                    {loading && <p>Generating image...</p>}
                  </div>
                ) : (
                  "Describe the image you want to create or use voice..."
                )}
              </div>
            </>
          )}
        </section>

        {error && (
          <div style={{ color: "#ff6b6b", marginTop: "16px", padding: "12px" }}>
            Error: {error}
          </div>
        )}
      </main>

      <form className="bottom-input" onSubmit={handleSubmit}>
        <button type="button" className="voice-btn" disabled>
          🎤
        </button>

        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            tab === "ask"
              ? "Ask me anything..."
              : "Describe the image you want to create..."
          }
          disabled={loading}
        />

        <button type="submit" className="send-btn" disabled={loading}>
          {loading
            ? "Processing..."
            : tab === "ask"
            ? "Send"
            : "Generate"}
        </button>
      </form>
    </div>
  );
}

export default App;
