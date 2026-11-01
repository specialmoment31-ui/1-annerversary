import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./OurStory.css";

const VAULT_ID = "dbb6330d-5f6d-4c51-9755-6fe6a4fba4e8";
const BUCKET = "budu-memory-media";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 120;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const categories = [
  "milestone",
  "date",
  "adventure",
  "little moment",
  "celebration",
];

function safeFileName(name) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getAudioExtension(mimeType) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export default function OurStory({ onOpenGallery }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState(null);

  const [title, setTitle] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("little moment");

  const [photo, setPhoto] = useState(null);
  const [caption, setCaption] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  const [video, setVideo] = useState(null);
  const [videoCaption, setVideoCaption] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");

  // Voice-note state.
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioCaption, setAudioCaption] = useState("");

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingStartRef = useRef(0);
  const stopReasonRef = useRef("save");

  // Create a stable preview URL for the selected photo.
  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(photo);
    setPhotoPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Create a stable preview URL for the selected video.
  useEffect(() => {
    if (!video) {
      setVideoPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(video);
    setVideoPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [video]);

  // Create a stable preview URL for the voice note.
  useEffect(() => {
    if (!audioFile) {
      setAudioPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(audioFile);
    setAudioPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Update the recording timer.
  useEffect(() => {
    if (!isRecording) return undefined;

    const timer = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - recordingStartRef.current) / 1000
      );

      setRecordingSeconds(elapsed);

      if (elapsed >= MAX_RECORDING_SECONDS) {
        stopReasonRef.current = "limit";

        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  // Release the microphone if this component unmounts.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function loadMemories() {
    setLoading(true);
    setError("");

    try {
      const { data: memoryData, error: queryError } = await supabase
        .from("memories")
        .select("id, title, description, memory_date, category, created_at")
        .eq("vault_id", VAULT_ID)
        .order("memory_date", { ascending: false });

      if (queryError) throw queryError;

      const loadedMemories = memoryData ?? [];

      if (loadedMemories.length === 0) {
        setMemories([]);
        return;
      }

      const memoryIds = loadedMemories.map((memory) => memory.id);

      const { data: mediaData, error: mediaError } = await supabase
        .from("media_assets")
        .select(
          "id, vault_id, memory_id, storage_path, media_type, mime_type, file_size_bytes, caption, created_by, created_at"
        )
        .eq("vault_id", VAULT_ID)
        .in("memory_id", memoryIds)
        .order("created_at", { ascending: true });

      if (mediaError) {
        console.error("Could not load media_assets:", mediaError);
        throw mediaError;
      }

      const mediaWithUrls = await Promise.all(
        (mediaData ?? []).map(async (media) => {
          const { data, error: urlError } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(media.storage_path, 3600);

          if (urlError) {
            console.error(
              "Could not create media URL:",
              media.storage_path,
              urlError
            );
          }

          return {
            ...media,
            signedUrl: urlError ? null : data?.signedUrl ?? null,
          };
        })
      );

      const mediaByMemory = new Map();

      for (const media of mediaWithUrls) {
        if (!mediaByMemory.has(media.memory_id)) {
          mediaByMemory.set(media.memory_id, []);
        }

        mediaByMemory.get(media.memory_id).push(media);
      }

      setMemories(
        loadedMemories.map((memory) => ({
          ...memory,
          media: mediaByMemory.get(memory.id) ?? [],
        }))
      );
    } catch (err) {
      console.error("Could not load memories or media:", err);

      setError(
        "We couldn't load your memories or photos/videos/voice notes. Please refresh and check the Console."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemories();
  }, []);

  function handlePhotoChange(event) {
    setError("");

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setPhoto(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setPhoto(null);
      event.target.value = "";
      setError("Please select an image file.");
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setPhoto(null);
      event.target.value = "";
      setError("Please choose an image smaller than 5 MB.");
      return;
    }

    setPhoto(selectedFile);
  }

  function handleVideoChange(event) {
    setError("");

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setVideo(null);
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.includes(selectedFile.type)) {
      setVideo(null);
      event.target.value = "";
      setError("Please select an MP4 or WebM video.");
      return;
    }

    if (selectedFile.size > MAX_VIDEO_SIZE) {
      setVideo(null);
      event.target.value = "";
      setError("Please choose a video smaller than 50 MB.");
      return;
    }

    setVideo(selectedFile);
  }

  async function startRecording() {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(
        "Voice recording is not supported by this browser. Try the latest Chrome or Edge over HTTPS or localhost."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const supportedType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      stopReasonRef.current = "save";
      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setAudioFile(null);

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Something went wrong while recording. Please try again.");
      };

      recorder.onstop = () => {
        const mimeType =
          recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";

        const recordedBlob = new Blob(chunksRef.current, {
          type: mimeType,
        });

        const stopReason = stopReasonRef.current;

        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());

        if (streamRef.current === stream) {
          streamRef.current = null;
        }

        setIsRecording(false);

        if (stopReason === "discard") {
          setAudioFile(null);
          setRecordingSeconds(0);
          return;
        }

        if (recordedBlob.size === 0) {
          setAudioFile(null);
          setError("No audio was recorded. Please try again.");
          return;
        }

        if (recordedBlob.size > MAX_AUDIO_SIZE) {
          setAudioFile(null);
          setError(
            "This recording is larger than 10 MB. Please record a shorter note."
          );
          return;
        }

        const extension = getAudioExtension(mimeType);

        const recordedFile = new File(
          [recordedBlob],
          `voice-note-${Date.now()}.${extension}`,
          { type: mimeType }
        );

        setAudioFile(recordedFile);

        if (stopReason === "limit") {
          setError(
            "Recording reached the 2-minute limit. Your voice note is ready to preview."
          );
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Could not start voice recording:", err);

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setError(
          "Microphone permission was denied. Allow microphone access in your browser and try again."
        );
      } else {
        setError(
          "We couldn't start recording. Please check your microphone and try again."
        );
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsRecording(false);
    }
  }

  function stopRecording() {
    stopReasonRef.current = "save";

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function discardRecording() {
    if (isRecording && recorderRef.current?.state === "recording") {
      stopReasonRef.current = "discard";
      recorderRef.current.stop();
    } else {
      setAudioFile(null);
      setRecordingSeconds(0);
    }

    setAudioCaption("");
    setError("");
  }

  function handleEditMemory(memory) {
    setEditingMemoryId(memory.id);
    setTitle(memory.title || "");
    setMemoryDate(memory.memory_date || "");
    setDescription(memory.description || "");
    setCategory(memory.category || "little moment");

    setPhoto(null);
    setCaption("");
    setVideo(null);
    setVideoCaption("");
    setAudioFile(null);
    setAudioCaption("");
    setRecordingSeconds(0);
    setError("");

    document
      .getElementById("memory-title")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

    document.getElementById("memory-title")?.focus();
  }

  async function handleDeleteMemory(memory) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${memory.title}" and its attached photos, videos, and voice notes? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSaving(true);

    try {
      const storagePaths = (memory.media || []).map(
        (item) => item.storage_path
      );

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove(storagePaths);

        if (storageError) {
          throw new Error(
            `Could not delete the attached media: ${storageError.message}`
          );
        }
      }

      const { error: mediaDeleteError } = await supabase
        .from("media_assets")
        .delete()
        .eq("vault_id", VAULT_ID)
        .eq("memory_id", memory.id);

      if (mediaDeleteError) {
        throw new Error(
          `Media files were removed, but their database records could not be deleted: ${mediaDeleteError.message}`
        );
      }

      const { error: memoryDeleteError } = await supabase
        .from("memories")
        .delete()
        .eq("vault_id", VAULT_ID)
        .eq("id", memory.id);

      if (memoryDeleteError) {
        throw new Error(
          `Media was removed, but the memory could not be deleted: ${memoryDeleteError.message}`
        );
      }

      if (editingMemoryId === memory.id) {
        resetForm();
      }

      await loadMemories();
      setError("Memory deleted successfully. ♡");
    } catch (err) {
      console.error("Could not delete memory:", err);
      setError(
        err.message || "We couldn't delete this memory. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEditingMemoryId(null);
    setTitle("");
    setMemoryDate("");
    setDescription("");
    setCategory("little moment");

    setPhoto(null);
    setCaption("");
    setVideo(null);
    setVideoCaption("");
    setAudioFile(null);
    setAudioCaption("");
    setRecordingSeconds(0);

    const photoInput = document.getElementById("memory-photo");
    const videoInput = document.getElementById("memory-video");

    if (photoInput) photoInput.value = "";
    if (videoInput) videoInput.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !memoryDate) {
      setError("Please add a title and date for your memory.");
      return;
    }

    if (isRecording) {
      setError("Please stop your voice recording before saving the memory.");
      return;
    }

    const selectedPhoto = photo;
    const selectedVideo = video;
    const selectedAudio = audioFile;

    const selectedCaption = caption.trim();
    const selectedVideoCaption = videoCaption.trim();
    const selectedAudioCaption = audioCaption.trim();

    setSaving(true);

    let memoryWasSaved = false;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Please sign in before adding a memory.");
      }

      // EDIT EXISTING MEMORY
      if (editingMemoryId) {
        const { error: updateError } = await supabase
          .from("memories")
          .update({
            title: title.trim(),
            description: description.trim(),
            memory_date: memoryDate,
            category,
          })
          .eq("vault_id", VAULT_ID)
          .eq("id", editingMemoryId)
          .select("id")
          .single();

        if (updateError) {
          throw new Error(
            `Could not update this memory: ${updateError.message}`
          );
        }

        resetForm();
        await loadMemories();
        setError("Memory updated successfully! ♡");
        return;
      }

      // =================================================
      // TEMPORARY DIAGNOSTICS: CHECK SESSION AND MEMBERSHIP
      // =================================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("========== MEMORY DIAGNOSTICS ==========");
      console.log("ACTUAL SESSION USER ID:", session?.user?.id ?? null);
      console.log("SESSION ERROR:", sessionError);
      console.log("GET USER ID:", user.id);
      console.log("VAULT ID:", VAULT_ID);

      // Check vault membership using the actual session.
      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("vault_members")
        .select("vault_id, user_id, member_role")
        .eq("vault_id", VAULT_ID)
        .eq("user_id", session?.user?.id ?? "");

      console.log("ACTUAL MEMBERSHIP:", membership);
      console.log("MEMBERSHIP ERROR:", membershipError);
      console.log("========================================");

      // Stop if the session is missing.
      if (!session?.user) {
        throw new Error(
          "No active Supabase session found. Please sign in again."
        );
      }

      // Verify that both authentication methods return the same user.
      if (session.user.id !== user.id) {
        throw new Error(
          "The Supabase session user does not match the authenticated user."
        );
      }

      // =================================================
      // 1. SAVE THE MEMORY
      // =================================================

      const { data: newMemory, error: insertError } = await supabase
        .from("memories")
        .insert({
          vault_id: VAULT_ID,
          title: title.trim(),
          description: description.trim(),
          memory_date: memoryDate,
          category,
          created_by: session.user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("MEMORY INSERT FAILED:", insertError);
        throw insertError;
      }

      memoryWasSaved = true;

      console.log("MEMORY INSERT SUCCESS:", newMemory);

      // =================================================
      // 2. UPLOAD PHOTO
      // =================================================

      if (selectedPhoto) {
        const storagePath = [
          VAULT_ID,
          newMemory.id,
          `${crypto.randomUUID()}-${safeFileName(selectedPhoto.name)}`,
        ].join("/");

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, selectedPhoto, {
            contentType: selectedPhoto.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("PHOTO STORAGE UPLOAD FAILED:", uploadError);
          throw new Error(
            `Memory saved, but photo upload failed: ${uploadError.message}`
          );
        }

        const { data: savedPhoto, error: mediaInsertError } = await supabase
          .from("media_assets")
          .insert({
            vault_id: VAULT_ID,
            memory_id: newMemory.id,
            storage_path: storagePath,
            media_type: "photo",
            mime_type: selectedPhoto.type,
            file_size_bytes: selectedPhoto.size,
            caption: selectedCaption || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (mediaInsertError) {
          console.error("PHOTO METADATA INSERT FAILED:", mediaInsertError);
          throw new Error(
            `Photo uploaded, but its metadata could not be saved: ${mediaInsertError.message}`
          );
        }

        console.log("PHOTO METADATA INSERT SUCCESS:", savedPhoto);
      }

      // =================================================
      // 3. UPLOAD VIDEO
      // =================================================

      if (selectedVideo) {
        const storagePath = [
          VAULT_ID,
          newMemory.id,
          `${crypto.randomUUID()}-${safeFileName(selectedVideo.name)}`,
        ].join("/");

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, selectedVideo, {
            contentType: selectedVideo.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("VIDEO STORAGE UPLOAD FAILED:", uploadError);
          throw new Error(
            `Memory saved, but video upload failed: ${uploadError.message}`
          );
        }

        const { data: savedVideo, error: mediaInsertError } = await supabase
          .from("media_assets")
          .insert({
            vault_id: VAULT_ID,
            memory_id: newMemory.id,
            storage_path: storagePath,
            media_type: "video",
            mime_type: selectedVideo.type,
            file_size_bytes: selectedVideo.size,
            caption: selectedVideoCaption || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (mediaInsertError) {
          console.error("VIDEO METADATA INSERT FAILED:", mediaInsertError);
          throw new Error(
            `Video uploaded, but its metadata could not be saved: ${mediaInsertError.message}`
          );
        }

        console.log("VIDEO METADATA INSERT SUCCESS:", savedVideo);
      }

      // =================================================
      // 4. UPLOAD VOICE NOTE
      // =================================================

      if (selectedAudio) {
        const storagePath = [
          VAULT_ID,
          newMemory.id,
          `${crypto.randomUUID()}-${safeFileName(selectedAudio.name)}`,
        ].join("/");

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, selectedAudio, {
            contentType: selectedAudio.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("VOICE NOTE STORAGE UPLOAD FAILED:", uploadError);
          throw new Error(
            `Memory saved, but voice-note upload failed: ${uploadError.message}`
          );
        }

        const { data: savedAudio, error: mediaInsertError } = await supabase
          .from("media_assets")
          .insert({
            vault_id: VAULT_ID,
            memory_id: newMemory.id,
            storage_path: storagePath,
            media_type: "audio",
            mime_type: selectedAudio.type,
            file_size_bytes: selectedAudio.size,
            caption: selectedAudioCaption || "Voice note",
            created_by: user.id,
          })
          .select()
          .single();

        if (mediaInsertError) {
          console.error("VOICE NOTE METADATA INSERT FAILED:", mediaInsertError);
          throw new Error(
            `Voice note uploaded, but its metadata could not be saved: ${mediaInsertError.message}`
          );
        }

        console.log("VOICE NOTE METADATA INSERT SUCCESS:", savedAudio);
      }

      // =================================================
      // 5. RESET FORM AND RELOAD MEMORIES
      // =================================================

      resetForm();
      await loadMemories();

      const mediaNames = [
        selectedPhoto && "photo",
        selectedVideo && "video",
        selectedAudio && "voice note",
      ].filter(Boolean);

      const successMessage =
        mediaNames.length === 0
          ? "Memory saved successfully! ♡"
          : `Memory and ${mediaNames.join(", ")} saved successfully! ♡`;

      setError(successMessage);
    } catch (err) {
      console.error("COULD NOT SAVE MEMORY:", err);

      if (memoryWasSaved) {
        await loadMemories();
      }

      setError(
        err.message || "We couldn't save this memory. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // Select the four most recent available photos for the preview.
  const previewPhotos = memories
    .flatMap((memory) =>
      (memory.media || [])
        .filter(
          (item) => item.media_type === "photo" && item.signedUrl
        )
        .map((item) => ({
          ...item,
          memoryTitle: memory.title,
        }))
    )
    .slice(0, 4);

  return (
    <section className="our-story" id="our-story">
      <div className="our-story__heading">
        <span className="our-story__eyebrow">
          A LITTLE PIECE OF FOREVER
        </span>

        <h2>Our Story ♡</h2>

        <p>
          Every little moment brought us here. Let's keep our favourite
          memories together.
        </p>
      </div>

      {/* Gallery preview */}
      <section className="story-gallery-preview">
        <div className="story-gallery-preview__heading">
          <div>
            <span>SNIPPETS OF US ♡</span>
            <h3>Little moments, forever</h3>
          </div>

          <button
            type="button"
            onClick={onOpenGallery}
          >
            View all photos →
          </button>
        </div>

        {previewPhotos.length > 0 ? (
          <div className="story-gallery-preview__grid">
            {previewPhotos.map((item) => (
              <button
                key={item.id}
                type="button"
                className="story-gallery-preview__photo"
                onClick={onOpenGallery}
                aria-label={`View photos from ${item.memoryTitle}`}
              >
                <img
                  src={item.signedUrl}
                  alt={item.caption || item.memoryTitle}
                  loading="lazy"
                />

                <span>{item.memoryTitle}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="story-gallery-preview__empty">
            Our photos will find their place here. ♡
          </p>
        )}
      </section>

      <form className="memory-form" onSubmit={handleSubmit}>
        <h3>
          {editingMemoryId
            ? "Edit our memory ♡"
            : "Add a little memory"}
        </h3>

        <label htmlFor="memory-title">Memory title</label>
        <input
          id="memory-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="The day we first met..."
          maxLength={150}
          required
          disabled={saving}
        />

        <label htmlFor="memory-date">Date</label>
        <input
          id="memory-date"
          type="date"
          value={memoryDate}
          onChange={(event) => setMemoryDate(event.target.value)}
          required
          disabled={saving}
        />

        <label htmlFor="memory-category">Memory type</label>
        <select
          id="memory-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={saving}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>

        <label htmlFor="memory-description">Our little story</label>
        <textarea
          id="memory-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Write down what made this day special..."
          rows={4}
          maxLength={5000}
          disabled={saving}
        />

        <label htmlFor="memory-photo">Add a photo (optional)</label>
        <input
          id="memory-photo"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          disabled={saving}
        />

        <p className="memory-form__hint">
          Choose one image, up to 5 MB.
        </p>

        {photo && photoPreviewUrl && (
          <div className="memory-photo-preview">
            <img
              src={photoPreviewUrl}
              alt="Selected memory preview"
            />
            <span>{photo.name}</span>
          </div>
        )}

        <label htmlFor="memory-caption">
          Photo caption (optional)
        </label>
        <input
          id="memory-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="My favourite day with you..."
          maxLength={500}
          disabled={saving}
        />

        <label htmlFor="memory-video">Add a video (optional)</label>
        <input
          id="memory-video"
          type="file"
          accept="video/mp4,video/webm"
          onChange={handleVideoChange}
          disabled={saving}
        />

        <p className="memory-form__hint">
          Choose one MP4 or WebM video, up to 50 MB.
        </p>

        {video && videoPreviewUrl && (
          <div className="memory-video-preview">
            <video
              key={videoPreviewUrl}
              src={videoPreviewUrl}
              controls
              preload="metadata"
              playsInline
            />
            <span>{video.name}</span>
          </div>
        )}

        <label htmlFor="memory-video-caption">
          Video caption (optional)
        </label>
        <input
          id="memory-video-caption"
          value={videoCaption}
          onChange={(event) => setVideoCaption(event.target.value)}
          placeholder="A little moment I want to remember..."
          maxLength={500}
          disabled={saving}
        />

        {/* Voice-note recorder */}
        <div className="memory-audio-recorder">
          <h4>Record a little voice note 🎙️</h4>

          <p className="memory-form__hint">
            Save a message in your own voice. Maximum recording time: 2 minutes.
          </p>

          <p
            className="memory-audio-recorder__timer"
            aria-live="polite"
          >
            {isRecording ? "Recording..." : "Recording time"}{" "}
            {formatTime(recordingSeconds)}
          </p>

          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={saving}
            >
              🎙️ {audioFile ? "Record Again" : "Start Recording"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              disabled={saving}
            >
              ⏹ Stop Recording
            </button>
          )}

          {audioFile && audioPreviewUrl && (
            <div className="memory-audio-preview">
              <p>Your voice note is ready, dude. ♡</p>

              <audio
                key={audioPreviewUrl}
                src={audioPreviewUrl}
                controls
                preload="metadata"
              />

              <p className="memory-form__hint">
                {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>

              <button
                type="button"
                onClick={discardRecording}
                disabled={saving || isRecording}
              >
                Remove Voice Note
              </button>
            </div>
          )}

          <label htmlFor="memory-audio-caption">
            Voice-note caption (optional)
          </label>

          <input
            id="memory-audio-caption"
            value={audioCaption}
            onChange={(event) => setAudioCaption(event.target.value)}
            placeholder="A message I'll always want to hear..."
            maxLength={500}
            disabled={saving}
          />
        </div>

        <button type="submit" disabled={saving || isRecording}>
          {saving
            ? "Saving our memory..."
            : editingMemoryId
              ? "Save changes ♡"
              : "Save this memory ♡"}
        </button>

        {editingMemoryId && (
          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
          >
            Cancel editing
          </button>
        )}
      </form>

      {error && (
        <p
          className={
            error.includes("successfully")
              ? "our-story__success"
              : "our-story__error"
          }
          role="status"
        >
          {error}
        </p>
      )}

      <div className="memory-timeline">
        {loading ? (
          <p className="our-story__status">
            Gathering our little memories… ♡
          </p>
        ) : memories.length === 0 ? (
          <div className="memory-empty">
            <span aria-hidden="true">♡</span>
            <h3>Our story starts here</h3>
            <p>
              Add your first memory above. Every little moment matters.
            </p>
          </div>
        ) : (
          memories.map((memory) => (
            <article className="memory-card" key={memory.id}>
              <span
                className="memory-card__heart"
                aria-hidden="true"
              >
                ♡
              </span>

              <div className="memory-card__content">
                <span className="memory-card__category">
                  {memory.category || "little moment"}
                </span>

                <h3>{memory.title}</h3>

                <time dateTime={memory.memory_date}>
                  {new Date(
                    `${memory.memory_date}T12:00:00`
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>

                {memory.description && <p>{memory.description}</p>}

                <div className="memory-card__actions">
                  <button
                    type="button"
                    onClick={() => handleEditMemory(memory)}
                    disabled={saving}
                  >
                    ✏️ Edit memory
                  </button>

                  <button
                    type="button"
                    className="memory-card__delete"
                    onClick={() => handleDeleteMemory(memory)}
                    disabled={saving}
                  >
                    🗑️ Delete memory
                  </button>
                </div>

                {memory.media?.length > 0 && (
                  <div className="memory-card__photos">
                    {memory.media.map((item) => (
                      <figure
                        key={item.id}
                        className="memory-card__photo"
                      >
                        {item.signedUrl ? (
                          item.media_type === "video" ? (
                            <video
                              className="memory-card__video"
                              src={item.signedUrl}
                              controls
                              preload="metadata"
                              playsInline
                            />
                          ) : item.media_type === "audio" ? (
                            <div className="memory-card__audio">
                              <span aria-hidden="true">🎙️</span>
                              <p>Our little voice note ♡</p>
                              <audio
                                src={item.signedUrl}
                                controls
                                preload="metadata"
                              />
                            </div>
                          ) : (
                            <img
                              src={item.signedUrl}
                              alt={item.caption || memory.title}
                              loading="lazy"
                            />
                          )
                        ) : (
                          <p className="our-story__status">
                            This media couldn't be displayed. Refresh to try
                            again.
                          </p>
                        )}

                        {item.caption && (
                          <figcaption>{item.caption}</figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}