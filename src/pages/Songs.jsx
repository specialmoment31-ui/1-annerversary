
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Songs.css";

const VAULT_ID = "dbb6330d-5f6d-4c51-9755-6fe6a4fba4e8";
const BIBEK_ID = "0b0ae4e6-9ee7-4826-a5d4-93940d1f4e0f";
const SANDESHI_ID = "bbb2e777-ca01-4177-91c3-5e657638c80f";

export default function Songs({ onBack }) {
  const [songs, setSongs] = useState([]);
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data?.user) {
      setError("Please sign in to open our playlist.");
      setLoading(false);
      return;
    }

    setUser(data.user);
    await fetchSongs();
    setLoading(false);
  }

  async function fetchSongs() {
    const { data, error: fetchError } = await supabase
      .from("love_songs")
      .select("*")
      .eq("vault_id", VAULT_ID)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Songs loading error:", fetchError);
      setError(fetchError.message);
      return;
    }

    setSongs(data || []);
  }

  function getAuthor(song) {
    if (song.created_by === user?.id) return "You";
    if (song.created_by === BIBEK_ID) return "Bibek";
    if (song.created_by === SANDESHI_ID) return "Sandeshi";
    return "Your person";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim() || !artist.trim() || !songUrl.trim()) {
      setError("Please enter the song title, artist and link.");
      return;
    }

    try {
      const parsedUrl = new URL(songUrl.trim());

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid link");
      }
    } catch {
      setError("Please enter a valid YouTube or Spotify link.");
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
        .from("love_songs")
        .update({
          title: title.trim(),
          artist: artist.trim(),
          song_url: songUrl.trim(),
          note: note.trim(),
        })
        .eq("id", editingId)
        .eq("created_by", user.id);
    } else {
      result = await supabase
        .from("love_songs")
        .insert({
          vault_id: VAULT_ID,
          created_by: user.id,
          title: title.trim(),
          artist: artist.trim(),
          song_url: songUrl.trim(),
          note: note.trim(),
        });
    }

    if (result.error) {
      console.error("Saving song error:", result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    resetForm();
    await fetchSongs();
    setSaving(false);
  }

  function resetForm() {
    setTitle("");
    setArtist("");
    setSongUrl("");
    setNote("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEditing(song) {
    setEditingId(song.id);
    setTitle(song.title);
    setArtist(song.artist);
    setSongUrl(song.song_url);
    setNote(song.note || "");
    setShowForm(true);
    setError("");
  }

  async function deleteSong(id) {
    if (!window.confirm("Remove this song from our playlist?")) return;

    const { error: deleteError } = await supabase
      .from("love_songs")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchSongs();
  }

  return (
    <main className="songs-page">
      <header className="songs-header">
        <button className="songs-back" onClick={onBack}>
          ← Back
        </button>

        <div className="songs-heading">
          <span className="songs-eyebrow">THE SOUNDTRACK OF US</span>
          <h1>Our Special Song</h1>
          <p>Every song has a memory. Every melody reminds me of you.</p>
        </div>

        <button
          className="songs-add-button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add a song
        </button>
      </header>

      {error && <div className="songs-error">{error}</div>}

      {showForm && (
        <section className="song-form-card">
          <h2>{editingId ? "Edit this song" : "Add our next favorite song"}</h2>

          <form onSubmit={handleSubmit}>
            <label htmlFor="song-title">Song title</label>
            <input
              id="song-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song name"
              required
            />

            <label htmlFor="song-artist">Artist</label>
            <input
              id="song-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Who sings it?"
              required
            />

            <label htmlFor="song-url">Spotify or YouTube link</label>
            <input
              id="song-url"
              type="url"
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
              placeholder="https://..."
              required
            />

            <label htmlFor="song-note">Why is this song special? (Optional)</label>
            <textarea
              id="song-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="This song reminds me of..."
              rows={3}
            />

            <div className="song-form-actions">
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update song"
                    : "Add to our playlist ♡"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="songs-list">
        {loading ? (
          <p className="songs-message">Tuning into our memories...</p>
        ) : songs.length === 0 ? (
          <div className="songs-empty">
            <span>🎵</span>
            <h2>Our playlist is waiting</h2>
            <p>Add the first song that reminds you of us.</p>
            <button onClick={() => setShowForm(true)}>
              Add our first song ♡
            </button>
          </div>
        ) : (
          songs.map((song) => (
            <article className="song-card" key={song.id}>
              <div className="song-art">♫</div>

              <div className="song-details">
                <h2>{song.title}</h2>
                <p className="song-artist">{song.artist}</p>

                {song.note && (
                  <p className="song-note">"{song.note}"</p>
                )}

                <span className="song-author">
                  Added by {getAuthor(song)} ·{" "}
                  {new Date(song.created_at).toLocaleDateString()}
                </span>

                <div className="song-actions">
                  <a
                    href={song.song_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Listen to song ↗
                  </a>

                  {song.created_by === user?.id && (
                    <>
                      <button onClick={() => startEditing(song)}>
                        Edit
                      </button>
                      <button onClick={() => deleteSong(song.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
