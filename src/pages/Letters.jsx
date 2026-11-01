
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Letters.css";

const VAULT_ID = "dbb6330d-5f6d-4c51-9755-6fe6a4fba4e8";
const BIBEK_ID = "0b0ae4e6-9ee7-4826-a5d4-93940d1f4e0f";
const SANDESHI_ID = "bbb2e777-ca01-4177-91c3-5e657638c80f";

export default function Letters({ onBack }) {
  const [letters, setLetters] = useState([]);
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data?.user) {
      setError("Please sign in to read your letters.");
      setLoading(false);
      return;
    }

    setUser(data.user);
    await fetchLetters();
    setLoading(false);
  }

  async function fetchLetters() {
    const { data, error: fetchError } = await supabase
      .from("love_letters")
      .select("*")
      .eq("vault_id", VAULT_ID)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Letters loading error:", fetchError);
      setError(fetchError.message);
      return;
    }

    setLetters(data || []);
  }

  function getAuthor(letter) {
    if (letter.created_by === user?.id) return "You";
    if (letter.created_by === BIBEK_ID) return "Bibek";
    if (letter.created_by === SANDESHI_ID) return "Sandeshi";
    return "Your person";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Please enter both a title and a letter.");
      return;
    }

    if (!user) {
      setError("Please sign in first.");
      return;
    }

    setSaving(true);
    setError("");

    let result;

    if (editingId) {
      result = await supabase
        .from("love_letters")
        .update({
          title: title.trim(),
          content: content.trim(),
        })
        .eq("id", editingId)
        .eq("created_by", user.id);
    } else {
      result = await supabase
        .from("love_letters")
        .insert({
          vault_id: VAULT_ID,
          created_by: user.id,
          title: title.trim(),
          content: content.trim(),
        });
    }

    if (result.error) {
      console.error("Saving letter error:", result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setContent("");
    setEditingId(null);
    setShowForm(false);

    await fetchLetters();
    setSaving(false);
  }

  function startEditing(letter) {
    setEditingId(letter.id);
    setTitle(letter.title);
    setContent(letter.content);
    setShowForm(true);
    setError("");
  }

  async function deleteLetter(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this letter?"
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("love_letters")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchLetters();
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setError("");
  }

  return (
    <main className="letters-page">
      <header className="letters-header">
        <button className="letters-back" onClick={onBack}>
          ← Back
        </button>

        <div className="letters-heading">
          <span className="letters-eyebrow">A LITTLE PIECE OF MY HEART</span>
          <h1>Words From My Heart</h1>
          <p>Letters that keep our love close, no matter the distance.</p>
        </div>

        <button
          className="letters-new-button"
          onClick={() => {
            cancelForm();
            setShowForm(true);
          }}
        >
          + Write a letter
        </button>
      </header>

      {error && <div className="letters-error">{error}</div>}

      {showForm && (
        <section className="letter-form-card">
          <h2>{editingId ? "Edit your letter" : "Write from your heart"}</h2>

          <form onSubmit={handleSubmit}>
            <label htmlFor="letter-title">Letter title</label>
            <input
              id="letter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A little message for you..."
              maxLength={150}
              required
            />

            <label htmlFor="letter-content">Your letter</label>
            <textarea
              id="letter-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write everything your heart wants to say..."
              rows={8}
              required
            />

            <div className="letter-form-actions">
              <button type="button" onClick={cancelForm}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update letter"
                    : "Publish letter ♡"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="letters-list">
        {loading ? (
          <p className="letters-message">Opening your letters...</p>
        ) : letters.length === 0 ? (
          <div className="letters-empty">
            <span>💌</span>
            <h2>Your story starts with a letter</h2>
            <p>Write the first letter and let your person read it.</p>
            <button onClick={() => setShowForm(true)}>
              Write our first letter
            </button>
          </div>
        ) : (
          letters.map((letter) => (
            <article className="letter-card" key={letter.id}>
              <div className="letter-card-top">
                <span>♡ A LETTER FOR US</span>
                <span>
                  {new Date(letter.created_at).toLocaleDateString()}
                </span>
              </div>

              <h2>{letter.title}</h2>
              <p className="letter-content">{letter.content}</p>

              <div className="letter-card-bottom">
                <span>With love, {getAuthor(letter)} ♡</span>

                {letter.created_by === user?.id && (
                  <div className="letter-actions">
                    <button onClick={() => startEditing(letter)}>
                      Edit
                    </button>
                    <button onClick={() => deleteLetter(letter.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
