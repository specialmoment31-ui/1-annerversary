
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import "./MemoryGarden.css";

const VAULT_ID = "dbb6330d-5f6d-4c51-9755-6fe6a4fba4e8";
const BUCKET_NAME = "budu-memory-media";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_SIZE = 10 * 1024 * 1024;

const flowerTypes = {
  milestone: "🌹",
  date: "🌷",
  adventure: "🌻",
  "little moment": "🌸",
  celebration: "🌼",
};

const categories = [
  "little moment",
  "milestone",
  "date",
  "adventure",
  "celebration",
];

function getToday() {
  const today = new Date();
  const offset = today.getTimezoneOffset();

  return new Date(today.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

function formatDate(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isVideo(file) {
  return file.type.startsWith("video/");
}

function isImage(file) {
  return file.type.startsWith("image/");
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function MemoryGarden({ onBack }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMemory, setSelectedMemory] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState(getToday());
  const [category, setCategory] = useState("little moment");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);

  const [memoryMedia, setMemoryMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const previewUrls = useRef(new Set());

  async function loadStorageUsage() {
    const { data, error: usageError } = await supabase
      .from("media_assets")
      .select("file_size_bytes")
      .eq("vault_id", VAULT_ID);

    if (usageError) {
      console.error("Could not load storage usage:", usageError);
      return;
    }

    const total = (data ?? []).reduce(
      (sum, item) => sum + Number(item.file_size_bytes || 0),
      0
    );

    setStorageUsed(total);
  }

  async function loadMemories() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      console.log("========== MEMORY GARDEN DEBUG ==========");
      console.log("CURRENT AUTH USER:", user?.id);
      console.log("EXPECTED VAULT ID:", VAULT_ID);
      console.log("AUTH ERROR:", authError);
      console.log("=========================================");

      if (authError) throw authError;

      if (!user) {
        throw new Error("No authenticated user found. Please sign in again.");
      }

      const { data, error: fetchError } = await supabase
        .from("memories")
        .select("*")
        .eq("vault_id", VAULT_ID)
        .order("memory_date", { ascending: true });

      console.log("MEMORIES DATA:", data);
      console.log("MEMORIES ERROR:", fetchError);

      if (fetchError) throw fetchError;

      setMemories(data ?? []);

      await loadStorageUsage();
    } catch (err) {
      console.error("Could not load memory garden:", err);
      console.error("MEMORY LOAD ERROR DETAILS:", {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
      });

      setError("Our garden couldn't bloom right now. Please try again. ♡");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  function handleFileSelection(event) {
    const incomingFiles = Array.from(event.target.files || []);
    const newItems = [];
    const errors = [];

    for (const file of incomingFiles) {
      if (isImage(file)) {
        if (file.size > MAX_PHOTO_SIZE) {
          errors.push(`${file.name}: photo must be 2 MB or smaller.`);
          continue;
        }
      } else if (isVideo(file)) {
        if (file.size > MAX_VIDEO_SIZE) {
          errors.push(`${file.name}: video must be 10 MB or smaller.`);
          continue;
        }
      } else {
        errors.push(`${file.name}: unsupported file type.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        caption: "",
        previewUrl,
      });
    }

    setSelectedFiles((previous) => [...previous, ...newItems]);
    setFormError(errors.join(" "));
    event.target.value = "";
  }

  function updateFileCaption(id, caption) {
    setSelectedFiles((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, caption } : item
      )
    );
  }

  function removeSelectedFile(id) {
    setSelectedFiles((previous) => {
      const item = previous.find((file) => file.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrls.current.delete(item.previewUrl);
      }

      return previous.filter((file) => file.id !== id);
    });
  }

  async function uploadMemoryMedia(memoryId, userId) {
    const failures = [];

    for (const item of selectedFiles) {
      const file = item.file;

      const filePath =
        `${VAULT_ID}/${memoryId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { error: metadataError } = await supabase
          .from("media_assets")
          .insert({
            vault_id: VAULT_ID,
            memory_id: memoryId,
            storage_path: filePath,
            media_type: isVideo(file) ? "video" : "image",
            mime_type: file.type,
            file_size_bytes: file.size,
            caption: item.caption.trim(),
            created_by: userId,
          });

        if (metadataError) {
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
          throw metadataError;
        }
      } catch (uploadError) {
        console.error(`Could not upload ${file.name}:`, uploadError);
        failures.push(file.name);
      }
    }

    return failures;
  }

  
async function handleAddMemory(event) {
  event.preventDefault();
  setFormError("");

  if (!title.trim() || !memoryDate) {
    setFormError("Please enter a title and memory date.");
    return;
  }

  setSaving(true);

  try {
    // 1. Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("You are not logged in. Please sign in again.");
    }

    console.log("Authenticated user:", user.id);
    console.log("Vault ID:", VAULT_ID);

    // 2. Check actual vault membership using the diagnostic RPC
    const {
      data: membershipCheck,
      error: membershipError,
    } = await supabase.rpc("debug_vault_membership", {
      p_vault_id: VAULT_ID,
    });

    if (membershipError) {
      throw new Error(
        `Membership diagnostic failed: ${membershipError.message}`
      );
    }

    const membership = Array.isArray(membershipCheck)
      ? membershipCheck[0]
      : membershipCheck;

    console.log("Membership result:", membership);

    if (!membership) {
      throw new Error("Supabase returned no membership result.");
    }

    if (membership.current_user_id !== user.id) {
      throw new Error(
        `Session mismatch. Website user: ${user.id}, database user: ${membership.current_user_id}`
      );
    }

    if (membership.is_member !== true) {
      throw new Error(
        `This account is not recognized as a member of vault ${VAULT_ID}.`
      );
    }

    // 3. Insert the memory
    const { data, error: insertError } = await supabase
      .from("memories")
      .insert({
        title: title.trim(),
        description: description.trim(),
        memory_date: memoryDate,
        category,
        vault_id: VAULT_ID,
        created_by: user.id,
      })
      .select(
        "id, title, description, memory_date, category, created_at"
      )
      .single();

    if (insertError) {
      console.error("Memory insert failed:", insertError);
      throw new Error(
        `Memory insert failed: ${insertError.message}. Code: ${insertError.code || "unknown"}`
      );
    }

    // 4. Update the garden
    setMemories((previous) =>
      [...previous, data].sort(
        (a, b) =>
          new Date(a.memory_date) - new Date(b.memory_date)
      )
    );

    // 5. Upload selected photos/videos
    let uploadMessage = "";

    if (selectedFiles.length > 0) {
      const failedFiles = await uploadMemoryMedia(data.id, user.id);

      if (failedFiles.length > 0) {
        uploadMessage =
          `Memory saved, but these files could not upload: ${failedFiles.join(", ")}.`;
      }
    }

    // 6. Clean up the form
    selectedFiles.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      previewUrls.current.delete(item.previewUrl);
    });

    setSelectedFiles([]);
    setTitle("");
    setDescription("");
    setMemoryDate(getToday());
    setCategory("little moment");
    setShowForm(false);

    await loadStorageUsage();

    if (uploadMessage) {
      setError(uploadMessage);
    }
  } catch (err) {
    console.error("Could not save memory:", err);

    setFormError(
      err.message || "We couldn't save this memory. Please try again."
    );
  } finally {
    setSaving(false);
  }
}


  async function openMemory(memory) {
    setSelectedMemory(memory);
    setMemoryMedia([]);
    setMediaError("");
    setMediaLoading(true);

    try {
      const { data, error: mediaFetchError } = await supabase
        .from("media_assets")
        .select(
          "id, storage_path, media_type, mime_type, file_size_bytes, caption"
        )
        .eq("memory_id", memory.id)
        .eq("vault_id", VAULT_ID)
        .order("created_at", { ascending: true });

      if (mediaFetchError) throw mediaFetchError;

      const signedMedia = await Promise.all(
        (data ?? []).map(async (item) => {
          const { data: signedData, error: signedError } =
            await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(item.storage_path, 3600);

          if (signedError) {
            console.error("Could not create signed URL:", signedError);
            return null;
          }

          return {
            ...item,
            signedUrl: signedData.signedUrl,
          };
        })
      );

      setMemoryMedia(signedMedia.filter(Boolean));
    } catch (err) {
      console.error("Could not load memory media:", err);
      setMediaError("We couldn't load the photos and videos for this memory.");
    } finally {
      setMediaLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedMemory) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedMemory(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedMemory]);

  return (
    <main className="memory-garden">
      <header className="memory-garden__header">
        <span className="memory-garden__eyebrow">
          A GARDEN MADE OF US
        </span>

        <h1>Our Memory Garden 🌷</h1>

        <p>
          Every little moment is a seed. Every memory is a flower.
          Together, we're growing something beautiful.
        </p>

        <button
          type="button"
          className="memory-garden__back"
          onClick={onBack}
        >
          ← Back to our story
        </button>
      </header>

      <section className="memory-garden__scene">
        <div className="memory-garden__sun" />

        <div className="memory-garden__intro">
          <span>♡</span>
          <p>Welcome to our little forever garden</p>
        </div>

        <div className="memory-garden__storage">
          <span>♡ Shared memory storage</span>
          <strong>{formatBytes(storageUsed)} used</strong>

          <div className="memory-garden__storage-track">
            <div
              className="memory-garden__storage-fill"
              style={{
                width: `${Math.min((storageUsed / (500 * 1024 * 1024)) * 100, 100)}%`,
              }}
            />
          </div>

          <small>500 MB storage reference</small>
        </div>

        <button
          type="button"
          className="memory-garden__add-button"
          onClick={() => {
            setFormError("");
            setShowForm((previous) => !previous);
          }}
        >
          {showForm ? "× Close form" : "＋ Plant a new memory"}
        </button>

        {showForm && (
          <form className="memory-garden__form" onSubmit={handleAddMemory}>
            <span className="memory-garden__form-eyebrow">
              PLANT A LITTLE MEMORY ♡
            </span>

            <h2>What should we remember?</h2>

            <label htmlFor="memory-title">Memory title</label>
            <input
              id="memory-title"
              type="text"
              placeholder="e.g. Our first coffee date"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              required
            />

            <label htmlFor="memory-date">When did it happen?</label>
            <input
              id="memory-date"
              type="date"
              value={memoryDate}
              onChange={(event) => setMemoryDate(event.target.value)}
              required
            />

            <label htmlFor="memory-category">Choose your flower</label>
            <select
              id="memory-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {flowerTypes[item]}{" "}
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>

            <label htmlFor="memory-description">Tell our little story</label>
            <textarea
              id="memory-description"
              placeholder="Write what happened, how you felt, or why this moment matters..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />

            <label htmlFor="memory-media">
              Add photos and videos
            </label>

            <p className="memory-garden__upload-hint">
              Photos: maximum 2 MB each. Videos: maximum 10 MB each.
            </p>

            <input
              id="memory-media"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelection}
              disabled={saving}
            />

            {selectedFiles.length > 0 && (
              <div className="memory-garden__file-previews">
                {selectedFiles.map((item) => (
                  <div className="memory-garden__file-preview" key={item.id}>
                    {isVideo(item.file) ? (
                      <video src={item.previewUrl} controls />
                    ) : (
                      <img src={item.previewUrl} alt="Selected memory" />
                    )}

                    <input
                      type="text"
                      placeholder="Add a caption..."
                      value={item.caption}
                      onChange={(event) =>
                        updateFileCaption(item.id, event.target.value)
                      }
                      maxLength={150}
                      aria-label="Media caption"
                    />

                    <button
                      type="button"
                      onClick={() => removeSelectedFile(item.id)}
                      disabled={saving}
                    >
                      Remove
                    </button>

                    <small>
                      {item.file.name} · {formatBytes(item.file.size)}
                    </small>
                  </div>
                ))}
              </div>
            )}

            {formError && (
              <p className="memory-garden__form-error" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="memory-garden__save-button"
              disabled={saving}
            >
              {saving ? "Planting your memory..." : "Save our memory ♡"}
            </button>
          </form>
        )}

        {error && (
          <p className="memory-garden__status" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="memory-garden__status">
            Growing our little flowers… 🌱
          </p>
        ) : error && memories.length === 0 ? (
          <div className="memory-garden__status" role="alert">
            <button type="button" onClick={loadMemories}>
              Try again
            </button>
          </div>
        ) : memories.length === 0 ? (
          <div className="memory-garden__empty">
            <span>🌱</span>
            <h2>A little garden waiting to bloom</h2>
            <p>
              Plant your first memory using the button above.
              Its flower will appear here.
            </p>
          </div>
        ) : (
          <div className="memory-garden__flowers">
            {memories.map((memory, index) => {
              const flower = flowerTypes[memory.category] || "🌸";

              return (
                <button
                  type="button"
                  key={memory.id}
                  className="memory-garden__flower"
                  style={{
                    "--flower-delay": `${index * 0.12}s`,
                    "--flower-rotation": `${(index % 5 - 2) * 4}deg`,
                  }}
                  onClick={() => openMemory(memory)}
                  aria-label={`Open memory: ${memory.title}`}
                >
                  <span className="memory-garden__flower-icon">
                    {flower}
                  </span>

                  <span className="memory-garden__flower-title">
                    {memory.title}
                  </span>

                  <span className="memory-garden__flower-date">
                    {formatDate(memory.memory_date)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="memory-garden__ground">
          <span>Growing together, forever ♡</span>
        </div>
      </section>

      <footer className="memory-garden__footer">
        <p>
          {memories.length} little{" "}
          {memories.length === 1 ? "memory" : "memories"} blooming
          in our garden ♡
        </p>
      </footer>

      {selectedMemory && (
        <div
          className="memory-garden__modal"
          role="dialog"
          aria-modal="true"
          aria-label="Memory details"
          onClick={() => setSelectedMemory(null)}
        >
          <article
            className="memory-garden__modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="memory-garden__modal-close"
              onClick={() => setSelectedMemory(null)}
              aria-label="Close memory"
            >
              ×
            </button>

            <span className="memory-garden__modal-flower">
              {flowerTypes[selectedMemory.category] || "🌸"}
            </span>

            <span className="memory-garden__modal-eyebrow">
              A FLOWER FROM OUR STORY
            </span>

            <h2>{selectedMemory.title}</h2>

            <p className="memory-garden__modal-date">
              {formatDate(selectedMemory.memory_date)}
            </p>

            <div className="memory-garden__modal-divider">♡</div>

            <p className="memory-garden__modal-description">
              {selectedMemory.description ||
                "A little moment that will always belong to us. ♡"}
            </p>

            <span className="memory-garden__modal-category">
              {selectedMemory.category || "little moment"}
            </span>

            <div className="memory-garden__media-gallery">
              <h3>Little pieces of this memory ♡</h3>

              {mediaLoading ? (
                <p>Opening our memories…</p>
              ) : mediaError ? (
                <p role="alert">{mediaError}</p>
              ) : memoryMedia.length === 0 ? (
                <p>No photos or videos added to this memory yet.</p>
              ) : (
                <div className="memory-garden__media-grid">
                  {memoryMedia.map((media) => (
                    <div className="memory-garden__media-item" key={media.id}>
                      {media.media_type === "video" ? (
                        <video
                          src={media.signedUrl}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <a
                          href={media.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={media.signedUrl}
                            alt={media.caption || "Our memory"}
                          />
                        </a>
                      )}

                      {media.caption && <p>{media.caption}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="memory-garden__modal-footer">
              This little memory will bloom forever.
            </p>
          </article>
        </div>
      )}
    </main>
  );
}
