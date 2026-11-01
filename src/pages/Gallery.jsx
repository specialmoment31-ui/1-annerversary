
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Gallery.css";

const VAULT_ID = "dbb6330d-5f6d-4c51-9755-6fe6a4fba4e8";
const BUCKET = "budu-memory-media";

const categories = [
  "all",
  "milestone",
  "date",
  "adventure",
  "little moment",
  "celebration",
];

function formatDate(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

export default function Gallery({ onBack }) {
  const [photos, setPhotos] = useState([]);
  const [memories, setMemories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [selectedMemory, setSelectedMemory] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  async function loadPhotos() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      setCurrentUser(user);

      const { data: memoriesData, error: memoriesError } =
        await supabase
          .from("memories")
          .select("id, title, memory_date, category")
          .eq("vault_id", VAULT_ID)
          .order("memory_date", { ascending: false });

      if (memoriesError) throw memoriesError;

      const memoryList = memoriesData ?? [];
      setMemories(memoryList);

      if (memoryList.length === 0) {
        setPhotos([]);
        return;
      }

      const memoryIds = memoryList.map((memory) => memory.id);

      const { data: mediaData, error: mediaError } =
        await supabase
          .from("media_assets")
          .select(
            "id, memory_id, storage_path, media_type, mime_type, file_size_bytes, caption, created_by, created_at"
          )
          .eq("vault_id", VAULT_ID)
          .in("memory_id", memoryIds)
          .in("media_type", ["image", "photo"])
          .order("created_at", { ascending: false });

      if (mediaError) throw mediaError;

      const memoryById = new Map(
        memoryList.map((memory) => [memory.id, memory])
      );

      const photoResults = await Promise.all(
        (mediaData ?? []).map(async (photo) => {
          try {
            const { data, error: urlError } =
              await supabase.storage
                .from(BUCKET)
                .createSignedUrl(photo.storage_path, 3600);

            if (urlError) throw urlError;

            return {
              ...photo,
              signedUrl: data?.signedUrl ?? null,
              memory: memoryById.get(photo.memory_id),
            };
          } catch (urlError) {
            console.error("Could not load photo:", urlError);
            return null;
          }
        })
      );

      setPhotos(photoResults.filter(Boolean).filter((photo) => photo.signedUrl));
    } catch (err) {
      console.error("Could not load gallery:", err);
      setError(
        "We couldn't load our photos. Please refresh and try again. ♡"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPhoto]);

  async function handleUpload(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!currentUser) {
      setError("Please sign in before uploading a photo.");
      return;
    }

    if (!selectedFile || !selectedMemory) {
      setError("Please choose a photo and select a memory. ♡");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setUploading(true);

    let uploadedPath = null;

    try {
      const safeName = selectedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      uploadedPath =
        `${VAULT_ID}/${currentUser.id}/` +
        `${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("media_assets")
        .insert({
          vault_id: VAULT_ID,
          memory_id: selectedMemory,
          storage_path: uploadedPath,
          media_type: "photo",
          mime_type: selectedFile.type,
          file_size_bytes: selectedFile.size,
          caption: caption.trim() || null,
          created_by: currentUser.id,
        });

      if (insertError) {
        await supabase.storage
          .from(BUCKET)
          .remove([uploadedPath]);

        uploadedPath = null;
        throw insertError;
      }

      setSelectedFile(null);
      setCaption("");
      setSelectedMemory("");

      const fileInput = document.getElementById("gallery-photo-input");
      if (fileInput) fileInput.value = "";

      setSuccess("Your photo has been added to our memories. ♡");

      await loadPhotos();
    } catch (err) {
      console.error("Photo upload failed:", err);

      setError(
        err.message ||
          "We couldn't upload your photo. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo) {
    const isOwner = photo.created_by === currentUser?.id;

    if (!isOwner) {
      setError("You can only delete photos you uploaded.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this photo from our gallery?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", photo.id)
        .eq("created_by", currentUser.id);

      if (deleteError) throw deleteError;

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([photo.storage_path]);

      if (storageError) {
        console.error("Storage cleanup failed:", storageError);
      }

      setSelectedPhoto(null);
      setSuccess("Photo removed from our gallery. ♡");

      await loadPhotos();
    } catch (err) {
      console.error("Photo deletion failed:", err);
      setError(
        err.message ||
          "We couldn't delete this photo. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredPhotos =
    selectedCategory === "all"
      ? photos
      : photos.filter(
          (photo) => photo.memory?.category === selectedCategory
        );

  return (
    <main className="photo-gallery">
      <header className="photo-gallery__heading">
        <span className="photo-gallery__eyebrow">
          LITTLE MOMENTS, FOREVER
        </span>

        <h1>Our Little Gallery ♡</h1>

        <p>
          Every picture holds a memory. Every memory holds a piece of us.
        </p>

        <button
          type="button"
          className="photo-gallery__back"
          onClick={onBack}
        >
          ← Back to our story
        </button>
      </header>

      <section className="photo-gallery__upload">
        <div className="photo-gallery__upload-heading">
          <span>♡</span>
          <div>
            <h2>Add a little memory</h2>
            <p>Save another moment in our forever collection.</p>
          </div>
        </div>

        <form onSubmit={handleUpload}>
          <label htmlFor="gallery-photo-input">
            Choose a photo
          </label>

          <input
            id="gallery-photo-input"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] || null)
            }
          />

          {selectedFile && (
            <p className="photo-gallery__file-name">
              Selected: {selectedFile.name}
            </p>
          )}

          <label htmlFor="gallery-memory-select">
            Connect it to a memory
          </label>

          <select
            id="gallery-memory-select"
            value={selectedMemory}
            onChange={(event) => setSelectedMemory(event.target.value)}
            required
          >
            <option value="">Choose one of our memories</option>
            {memories.map((memory) => (
              <option key={memory.id} value={memory.id}>
                {memory.title} — {formatDate(memory.memory_date)}
              </option>
            ))}
          </select>

          <label htmlFor="gallery-caption">
            Caption <span>(optional)</span>
          </label>

          <input
            id="gallery-caption"
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="A little note about this photo..."
            maxLength={250}
          />

          <button
            type="submit"
            className="photo-gallery__upload-button"
            disabled={uploading || memories.length === 0}
          >
            {uploading ? "Saving our memory..." : "♡ Add to our gallery"}
          </button>

          {memories.length === 0 && (
            <p className="photo-gallery__hint">
              Create a memory in Our Story before uploading a photo.
            </p>
          )}
        </form>
      </section>

      {error && (
        <p className="photo-gallery__message photo-gallery__message--error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="photo-gallery__message photo-gallery__message--success" role="status">
          {success}
        </p>
      )}

      <nav
        className="photo-gallery__filters"
        aria-label="Filter photos"
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={
              selectedCategory === category
                ? "photo-gallery__filter is-active"
                : "photo-gallery__filter"
            }
            aria-pressed={selectedCategory === category}
            onClick={() => setSelectedCategory(category)}
          >
            {category === "all"
              ? "All photos"
              : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="photo-gallery__status" role="status">
          Gathering our little memories… ♡
        </p>
      ) : error && photos.length === 0 ? (
        <p className="photo-gallery__status" role="alert">
          {error}
        </p>
      ) : filteredPhotos.length === 0 ? (
        <div className="photo-gallery__empty">
          <span>♡</span>
          <h2>No photos here just yet</h2>
          <p>
            Add a photo above and connect it to one of our memories.
          </p>
        </div>
      ) : (
        <div className="photo-gallery__grid">
          {filteredPhotos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="photo-gallery__card"
              onClick={() => setSelectedPhoto(photo)}
              aria-label={`View ${photo.caption || photo.memory?.title || "memory photo"}`}
            >
              <img
                src={photo.signedUrl}
                alt={photo.caption || photo.memory?.title || "Our memory"}
                loading="lazy"
              />

              <span className="photo-gallery__card-caption">
                <strong>
                  {photo.caption || photo.memory?.title || "Our little moment"}
                </strong>

                {photo.memory?.title && (
                  <small>{photo.memory.title}</small>
                )}

                <small>{formatDate(photo.memory?.memory_date)}</small>

                <small>
                  {photo.created_by === currentUser?.id
                    ? "Added by you ♡"
                    : "Added by your person ♡"}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="photo-gallery__count">
        {loading
          ? ""
          : `${filteredPhotos.length} photo${filteredPhotos.length === 1 ? "" : "s"} in our collection ♡`}
      </p>

      {selectedPhoto && (
        <div
          className="photo-gallery__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            className="photo-gallery__close"
            aria-label="Close photo"
            onClick={() => setSelectedPhoto(null)}
          >
            ×
          </button>

          <figure
            className="photo-gallery__lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedPhoto.signedUrl}
              alt={selectedPhoto.caption || selectedPhoto.memory?.title || "Our memory"}
            />

            <figcaption>
              <strong>
                {selectedPhoto.caption ||
                  selectedPhoto.memory?.title ||
                  "Our little moment"}
              </strong>

              <p>{selectedPhoto.memory?.title}</p>
              <p>{formatDate(selectedPhoto.memory?.memory_date)}</p>
              <p>
                {selectedPhoto.created_by === currentUser?.id
                  ? "Added by you ♡"
                  : "Added by your person ♡"}
              </p>

              {selectedPhoto.created_by === currentUser?.id && (
                <button
                  type="button"
                  className="photo-gallery__delete"
                  onClick={() => handleDelete(selectedPhoto)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete this photo"}
                </button>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}
