
import OurStory from "./components/OurStory";
import Gallery from "./pages/Gallery";
import MemoryGarden from "./pages/MemoryGarden";
import Letters from "./pages/Letters";
import Songs from "./pages/Songs";
import { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

const relationshipStart = new Date("2025-11-01T00:00:00+05:45");
const anniversary = new Date("2026-11-01T00:00:00+05:45");

const memories = [
  {
    icon: "📸",
    title: "A moment to remember",
    description: "Add one of your favorite photos together.",
    type: "PHOTO",
  },
  {
    icon: "💌",
    title: "Words from my heart",
    description: "Save a message that means everything to you.",
    type: "LETTER",
  },
  {
    icon: "🎵",
    title: "Our special song",
    description: "Keep the song that reminds you of each other.",
    type: "SONG",
  },
];

function getCountdown() {
  const now = Date.now();
  const anniversaryTime = anniversary.getTime();
  const relationshipStartTime = relationshipStart.getTime();

  const isAnniversaryReached = now >= anniversaryTime;

  const difference = isAnniversaryReached
    ? now - relationshipStartTime
    : anniversaryTime - now;

  return {
    mode: isAnniversaryReached ? "together" : "countdown",
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference % 86400000) / 3600000),
    minutes: Math.floor((difference % 3600000) / 60000),
    seconds: Math.floor((difference % 60000) / 1000),
  };
}

function App() {
  const [countdown, setCountdown] = useState(getCountdown);
  const [letterOpen, setLetterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [loggingOut, setLoggingOut] = useState(false);

  // Interactive Budu anniversary section
  const [specialLetterOpen, setSpecialLetterOpen] = useState(false);
  const [revealedReasons, setRevealedReasons] = useState([]);
  const [giftOpened, setGiftOpened] = useState(false);
  const [activeSpecialMemory, setActiveSpecialMemory] = useState(0);

  // Anniversary music and celebration
  const [specialMusicPlaying, setSpecialMusicPlaying] = useState(false);
  const [celebrationStarted, setCelebrationStarted] = useState(false);

  // Suprise started
  const [surpriseStarted, setSurpriseStarted] = useState(false);
  const [cakeCut, setCakeCut] = useState(false);

  const specialAudioRef = useRef(null);

  // Play or pause the special anniversary song
  const toggleSpecialMusic = async () => {
  const audio = specialAudioRef.current;

    if (!audio) return;

    if (specialMusicPlaying) {
      audio.pause();
      setSpecialMusicPlaying(false);
      return;
    }

    try {
      await audio.play();
      setSpecialMusicPlaying(true);
      setCelebrationStarted(true);
    } catch (error) {
      console.error("Music could not play:", error);
      alert(
        "Please check that your music file exists in public/music/our-song.mp3"
      );
    }
  };

  // Logout
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      alert("Logout failed: " + error.message);
      setLoggingOut(false);
      return;
    }

    // The authentication gate should now show the login screen.
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Open Gallery without removing the existing homepage.
  if (currentPage === "gallery") {
    return <Gallery onBack={() => setCurrentPage("home")} />;
  }

  // Open Letters without removing the existing homepage.
  if (currentPage === "letters") {
    return <Letters onBack={() => setCurrentPage("home")} />;
  }

  // Open Our Special Song page.
  if (currentPage === "songs") {
    return <Songs onBack={() => setCurrentPage("home")} />;
  }

  // Open Memory Garden without removing the existing homepage.
  if (currentPage === "garden") {
    return <MemoryGarden onBack={() => setCurrentPage("home")} />;
  }

  const goTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main>
      {/* NAVIGATION */}
      <nav className="navbar">
        <a
          className="brand"
          href="#home"
          onClick={() => setCurrentPage("home")}
        >
          <span className="brand-heart">♥</span> budu & me
        </a>

        <div className="nav-links">
          <button onClick={() => goTo("story")}>Our Story</button>

          <button onClick={() => goTo("memories")}>Memories</button>

          <button onClick={() => setCurrentPage("garden")}>
            Memory Garden 🌷
          </button>

          <button onClick={() => goTo("letter")}>Love Letter</button>

          <button onClick={() => setCurrentPage("gallery")}>
            Gallery ♡
          </button>
        </div>

        <div className="nav-actions">
          <button
            className="nav-heart"
            onClick={() => goTo("letter")}
          >
            Made with love ♡
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout ↗"}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />

        <div className="hero-content">
          <p className="eyebrow">
            ✧ A LITTLE UNIVERSE MADE FOR YOU ✧
          </p>

          <h1>
            For my
            <br />
            <span>BUDU</span>
            <span className="title-heart"> ♡</span>
          </h1>

          <p className="hero-description">
            One year of us, a thousand little memories,
            and a lifetime still waiting.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => goTo("for-budu")}
            >
              Enter our little world <span>♡</span>
            </button>

            <button
              className="text-button"
              onClick={() => setLetterOpen(true)}
            >
              A letter for you ↗
            </button>
          </div>

          <div className="hero-note">
            <span>✿</span>
            <span>
              My favorite place will always be with you.
            </span>
          </div>
        </div>

        <div
          className="hero-art"
          aria-label="Romantic floral illustration"
        >
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />

          <div className="art-center">
            <span className="art-flower">✿</span>
            <span className="art-heart">♥</span>
            <span className="art-flower second-flower">✿</span>
          </div>

          <span className="floating-heart heart-one">♡</span>
          <span className="floating-heart heart-two">♥</span>
          <span className="floating-heart heart-three">♡</span>
          <span className="floating-star star-one">✧</span>
          <span className="floating-star star-two">✦</span>

          <div className="art-caption">
            <span>YOU + ME</span>
            <span>OUR LITTLE FOREVER</span>
          </div>
        </div>

        <div className="hero-bottom">
          <span>SCROLL TO EXPLORE</span>
          <span className="scroll-line" />
        </div>
      </section>


{/* ==========================================
    INTERACTIVE ANNIVERSARY EXPERIENCE FOR BUDU
========================================== */}
<section className="budu-special-section" id="for-budu">
  <div className="budu-special-background">
    <span className="budu-floating-heart heart-a">♡</span>
    <span className="budu-floating-heart heart-b">♥</span>
    <span className="budu-floating-heart heart-c">♡</span>
    <span className="budu-floating-flower flower-a">✿</span>
    <span className="budu-floating-flower flower-b">❀</span>
  </div>

  <div className="budu-special-container">

    {/* WELCOME */}
    <div className="budu-welcome">
      <span className="budu-special-eyebrow">
        ✧ NOVEMBER 1, 2026 · OUR FIRST ANNIVERSARY ✧
      </span>

      <h2>
        Today is all about
        <span> you, Budu.</span>
      </h2>

      <p>
        I made a little world filled with love, memories,
        and surprises. Every little thing here is for you.
      </p>

      <div className="budu-welcome-heart">♡</div>

      <button
        className="budu-discover-button"
        onClick={() =>
          document.getElementById("budu-letter")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }
      >
        Discover your surprises <span>↓</span>
      </button>
    </div>

    {/* LOVE LETTER */}
    <div className="budu-experience-card" id="budu-letter">
      <div className="budu-card-heading">
        <span className="budu-card-number">01</span>
        <div>
          <span className="budu-card-kicker">A MESSAGE FROM MY HEART</span>
          <h3>A letter just for you</h3>
        </div>
      </div>

      <div className="budu-envelope-area">
        <div className={`budu-envelope ${specialLetterOpen ? "opened" : ""}`}>
          <div className="budu-envelope-flap" />
          <div className="budu-envelope-body">
            <span className="budu-envelope-heart">♥</span>
            <span className="budu-envelope-label">TO MY BUDU</span>
          </div>
        </div>

        <p className="budu-envelope-hint">
          {specialLetterOpen
            ? "A little piece of my heart, just for you."
            : "There's something inside waiting for you..."}
        </p>

        <button
          className="budu-action-button"
          onClick={() => setSpecialLetterOpen(!specialLetterOpen)}
        >
          {specialLetterOpen ? "Close my letter ↑" : "Open your letter ♡"}
        </button>
      </div>

      {specialLetterOpen && (
        <div className="budu-revealed-letter">
          <span className="budu-letter-decoration">✿</span>
          <p className="budu-handwritten">My dearest Budu,</p>

          <p>
            One year ago, I had no idea how many beautiful
            memories we would create together. Today, when I
            look back, I realise that the little moments with
            you have become some of my favourite parts of life.
          </p>

          <p>
            Thank you for your smiles, your love, your patience,
            and for being part of my world. I may not always find
            the perfect words, but I hope you always feel how
            much you mean to me.
          </p>

          <p>
            I don't just want to celebrate the year we've had.
            I want to keep creating countless little moments
            with you in all the years ahead.
          </p>

          <p className="budu-letter-signature">
            Happy first anniversary, my love.
            <br />
            Forever yours, ♡
          </p>
        </div>
      )}
    </div>

    {/* TWELVE REASONS */}
    <div className="budu-experience-card">
      <div className="budu-card-heading">
        <span className="budu-card-number">02</span>
        <div>
          <span className="budu-card-kicker">A DOZEN LITTLE REMINDERS</span>
          <h3>12 reasons I love you</h3>
        </div>
      </div>

      <p className="budu-section-instruction">
        Tap each heart to discover a little reason.
      </p>

      <div className="budu-reasons-grid">
        {[
          "Your smile can make my entire day better.",
          "You make ordinary moments feel special.",
          "I love the way you laugh.",
          "You make me feel at home.",
          "I love our little conversations.",
          "You make even simple days memorable.",
          "I love your caring heart.",
          "You inspire me to become better.",
          "I love being silly with you.",
          "You are my favourite person to talk to.",
          "Every memory with you means something.",
          "Because you are simply my Budu.",
        ].map((reason, index) => {
          const isRevealed = revealedReasons.includes(index);

          return (
            <button
              type="button"
              className={`budu-reason-card ${isRevealed ? "revealed" : ""}`}
              key={index}
              onClick={() => {
                setRevealedReasons((previous) =>
                  isRevealed
                    ? previous.filter((item) => item !== index)
                    : [...previous, index]
                );
              }}
              aria-expanded={isRevealed}
            >
              {isRevealed ? (
                <>
                  <span className="budu-reason-number">
                    REASON {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="budu-reason-text">{reason}</span>
                  <span className="budu-reason-heart">♥</span>
                </>
              ) : (
                <>
                  <span className="budu-hidden-heart">♡</span>
                  <span className="budu-reason-number">
                    REASON {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="budu-reason-tap">Tap to reveal</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <p className="budu-reasons-progress">
        {revealedReasons.length} of 12 little reasons discovered ♡
      </p>
    </div>

    {/* MEMORY MOMENTS */}
    <div className="budu-experience-card">
      <div className="budu-card-heading">
        <span className="budu-card-number">03</span>
        <div>
          <span className="budu-card-kicker">LITTLE MOMENTS, BIG FEELINGS</span>
          <h3>Our little memory corner</h3>
        </div>
      </div>

      <p className="budu-section-instruction">
        A few things I never want us to forget.
      </p>

      <div className="budu-memory-showcase">
        <div className="budu-memory-visual">
          <img
            src="/images/anniversary-photo.jpg"
            alt="A special memory of us"
            className="memory-corner"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }} 
          />

          <span className="budu-memory-overlay-heart">♡</span>
        </div>

        <div className="budu-memory-caption">
          <span className="budu-card-kicker">
            MEMORY {activeSpecialMemory + 1} OF 3
          </span>

          <h4>
            {[
              "The beginning of us",
              "All our little moments",
              "A story still growing",
            ][activeSpecialMemory]}
          </h4>

          <p>
            {[
              "The day our story began will always have a special place in my heart.",
              "It's the little things with you that make life beautiful.",
              "We've made so many memories, and I can't wait for all the ones ahead.",
            ][activeSpecialMemory]}
          </p>
        </div>

        <div className="budu-memory-controls">
          <button
            type="button"
            onClick={() =>
              setActiveSpecialMemory((previous) => (previous + 2) % 3)
            }
            aria-label="Previous memory"
          >
            ←
          </button>

          <div className="budu-memory-dots">
            {[0, 1, 2].map((item) => (
              <button
                type="button"
                key={item}
                className={activeSpecialMemory === item ? "active" : ""}
                onClick={() => setActiveSpecialMemory(item)}
                aria-label={`Show memory ${item + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveSpecialMemory((previous) => (previous + 1) % 3)
            }
            aria-label="Next memory"
          >
            →
          </button>
        </div>
      </div>

      <p className="budu-memory-note">
        Replace these sample moments with your real memories and photos later.
      </p>
    </div>

    {/* FINAL GIFT */}



{/* ==========================================
    ANNIVERSARY CELEBRATION
========================================== */}
<div className="budu-heart-celebration">

  <audio
    ref={specialAudioRef}
    src="/music/our-song.mp3"
    loop
    onEnded={() => setSpecialMusicPlaying(false)}
  />

  <div className="budu-celebration-stars">
    {Array.from({ length: 18 }, (_, index) => (
      <span key={index} style={{ "--star-index": index }}>
        {index % 2 === 0 ? "✦" : "♡"}
      </span>
    ))}
  </div>

  <div className="budu-celebration-content">

    <span className="budu-celebration-eyebrow">
      BEFORE YOUR FINAL SURPRISE
    </span>

    <h2>
      Close your eyes for a moment,
      <span> my love.</span>
    </h2>

    <p className="budu-celebration-description">
      Take a little breath. Think about us, our first year,
      all our silly moments, and everything still waiting
      for us.
    </p>

    {/* HEART CONNECTION */}
    <div className={`budu-heart-connection ${celebrationStarted ? "connected" : ""}`}>
      <span className="budu-orbit orbit-one" />
      <span className="budu-orbit orbit-two" />
      <span className="budu-connection-heart">♥</span>
      <span className="budu-heart-pulse pulse-one" />
      <span className="budu-heart-pulse pulse-two" />
    </div>

    <p className="budu-heart-caption">
      {celebrationStarted
        ? "Two hearts, one beautiful story. ♡"
        : "Some connections are simply special."}
    </p>

    {/* MUSIC CONTROL */}
    <button
      type="button"
      className="budu-music-button"
      onClick={toggleSpecialMusic}
    >
      <span className="budu-music-icon">
        {specialMusicPlaying ? "Ⅱ" : "♫"}
      </span>

      {specialMusicPlaying ? "Pause our song" : "Play our song"}
    </button>

    {specialMusicPlaying && (
      <div className="budu-music-visualizer" aria-label="Music playing">
        {Array.from({ length: 24 }, (_, index) => (
          <span key={index} style={{ "--bar-index": index }} />
        ))}
      </div>
    )}

    {/* CELEBRATION MESSAGE */}
    <div className={`budu-celebration-message ${celebrationStarted ? "show" : ""}`}>
      <div className="budu-celebration-confetti" aria-hidden="true">
        {Array.from({ length: 35 }, (_, index) => (
          <span key={index} style={{ "--confetti-index": index }}>
            {["♡", "✦", "♥", "✧"][index % 4]}
          </span>
        ))}
      </div>

      <span className="budu-celebration-small">
        A LITTLE CELEBRATION OF US
      </span>

      <h3>
        One year of memories.
        <br />
        A lifetime of possibilities.
      </h3>

      <p>
        Happy first anniversary, Sanu.
        I'm so lucky that our paths became one story.
      </p>

      <span className="budu-celebration-signature">
        I choose you. Today and always. ♡
      </span>
    </div>

    {/* START THE SURPRISE */}
    {!surpriseStarted && (
      <button
        type="button"
        className="budu-gift-continue"
        onClick={async () => {
          setSurpriseStarted(true);
          setCelebrationStarted(true);

          const audio = specialAudioRef.current;

          if (audio) {
            try {
              await audio.play();
              setSpecialMusicPlaying(true);
            } catch (error) {
              console.error("Music could not play:", error);
              alert("Please check public/music/our-song.mp3");
            }
          }
        }}
      >
        I'm ready for my surprise ♡
      </button>
    )}

  </div>
</div>

{/* CAKE SURPRISE - appears after clicking I'm ready */}
{surpriseStarted && (
  <div className={`budu-cake-surprise ${cakeCut ? "cake-is-cut" : ""}`}>

    {/* Warm lights */}
    <div className="warm-light warm-light-one"></div>
    <div className="warm-light warm-light-two"></div>
    <div className="warm-light warm-light-three"></div>

    {/* Floating balloons */}
    <div className="cake-balloons">
      <span className="balloon balloon-pink">♡</span>
      <span className="balloon balloon-gold">♡</span>
      <span className="balloon balloon-purple">♡</span>
      <span className="balloon balloon-red">♡</span>
      <span className="balloon balloon-pink">♡</span>
      <span className="balloon balloon-gold">♡</span>
    </div>

    <div className="cake-content">
      <p className="cake-eyebrow">A LITTLE CELEBRATION FOR US ✨</p>

      <h2>One Year of Loving You</h2>
      <p className="cake-subtitle">
        A sweet little cake for our sweetest journey together.
      </p>

      {/* Cake illustration */}
      <div className="beautiful-cake">
        <div className="cake-glow"></div>

        <div className="cake-candles">
          <span className="candle">
            <i className="flame"></i>
          </span>
          <span className="candle">
            <i className="flame"></i>
          </span>
          <span className="candle">
            <i className="flame"></i>
          </span>
        </div>

        <div className="cake-top">
          <span className="cake-heart">♥</span>
          <span className="cake-decoration">✦</span>
          <span className="cake-heart">♥</span>
        </div>

        <div className="cake-middle">
          <span className="icing-drip"></span>
          <span className="icing-drip"></span>
          <span className="icing-drip"></span>
          <span className="icing-drip"></span>
        </div>

        <div className="cake-bottom"></div>
        <div className="cake-plate"></div>

        <div className="cake-cut-line"></div>
      </div>

      <p className="cake-message">
        Every moment with you is sweeter than this cake. 💗
      </p>

      {!cakeCut ? (
        <button
          className="cake-cut-button"
          onClick={() => setCakeCut(true)}
        >
          Cut our cake together ♡
        </button>
      ) : (
        <div className="cake-cut-success">
          <h3>Happy First Anniversary, My Love! 💗</h3>
          <p>One year down, forever to go.</p>
        </div>
      )}
    </div>
  </div>
)}

{/* ==========================================
    FINAL GIFT - ONLY AFTER CAKE CUTTING
========================================== */}
{cakeCut && (
  <div className="budu-final-surprise" id="budu-final-gift">

    <span className="budu-card-kicker">
      ONE LAST LITTLE SURPRISE
    </span>

    <h3>I saved something special for you...</h3>

    <p>
      Because one letter and twelve reasons could never
      explain how much you mean to me.
    </p>

    <button
      type="button"
      className={`budu-gift-box ${giftOpened ? "gift-opened" : ""}`}
      onClick={() => setGiftOpened(!giftOpened)}
      aria-label={giftOpened ? "Close surprise gift" : "Open surprise gift"}
    >
      <span className="budu-gift-lid">
        <span className="budu-gift-bow">✿</span>
      </span>

      <span className="budu-gift-body">
        <span className="budu-gift-ribbon" />
        <span className="budu-gift-heart">♥</span>
      </span>
    </button>

    <p className="budu-gift-hint">
      {giftOpened ? "Your surprise is here ♡" : "Tap the gift to open it"}
    </p>

    {giftOpened && (
      <div className="budu-gift-message">
        <span>♡</span>

        <h3>My favourite forever is you.</h3>

        <p>
          No matter how many birthdays, anniversaries,
          or ordinary days come our way, I hope we keep
          choosing each other.
        </p>

        <p>
          Here's to our first year, our next chapter,
          and all the beautiful tomorrows waiting for us.
        </p>

        <strong>Happy anniversary, my Sanu. ♡</strong>
      </div>
    )}

  </div>
)}




    {/* CLOSING */}
    <div className="budu-special-closing">
      <span>✧</span>
      <p>Made with all my love, especially for you.</p>
      <h3>Always you. Always us. ♡</h3>
    </div>

  </div>
</section>


      {/* EXISTING STORY COMPONENT */}
      <OurStory
        onOpenGallery={() => setCurrentPage("gallery")}
      />

      {/* DREAMY VERTICAL ANNIVERSARY TIMELINE */}
      <section className="countdown-section" id="anniversary">
        <div className="love-timeline">
          <header className="love-timeline-header">
            <p className="eyebrow">
              ♡ OUR FIRST LITTLE FOREVER ♡
            </p>

            <h2>
              {countdown.mode === "countdown"
                ? "Our love, one beautiful chapter at a time."
                : "One year down, forever to go."}
            </h2>

            <p className="section-description">
              From the day our story began to all the little
              moments still waiting for us. Every second with
              you is a memory I want to keep.
            </p>
          </header>

          <div className="love-timeline-list">
            {/* CHAPTER ONE */}
            <article className="love-timeline-item">
              <div className="love-timeline-marker">
                <span>♥</span>
              </div>

              <div className="love-timeline-card">
                <p className="timeline-kicker">
                  CHAPTER ONE · THE BEGINNING
                </p>

                <h3>The day we became us.</h3>

                <p className="timeline-date">
                  November 1, 2025
                </p>

                <p className="timeline-description">
                  The beginning of my favourite story.
                  I didn't know all the beautiful memories
                  we'd make, but I knew every moment with you
                  would mean something special.
                </p>

                <span className="timeline-signature">
                  The beginning of always ♡
                </span>
              </div>
            </article>

            {/* CHAPTER TWO: LIVE COUNTDOWN */}
            <article className="love-timeline-item">
              <div className="love-timeline-marker">
                <span>♡</span>
              </div>

              <div className="love-timeline-card timeline-featured">
                <p className="timeline-kicker">
                  CHAPTER TWO · OUR NEXT MILESTONE
                </p>

                <h3>
                  {countdown.mode === "countdown"
                    ? "Our first anniversary is almost here."
                    : "Look how far we've come, my love."}
                </h3>

                <p className="timeline-description">
                  {countdown.mode === "countdown"
                    ? "A whole year of us is almost here. Here's to every little moment that brought us closer."
                    : "Our first anniversary has arrived, and our story is still growing with every passing second."}
                </p>

                <div className="love-counter">
                  {[
                    ["Days", countdown.days],
                    ["Hours", countdown.hours],
                    ["Minutes", countdown.minutes],
                    ["Seconds", countdown.seconds],
                  ].map(([label, value]) => (
                    <div
                      className="love-counter-unit"
                      key={label}
                    >
                      <span className="love-counter-number">
                        {String(value).padStart(2, "0")}
                      </span>

                      <span className="love-counter-label">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="timeline-date-pill">
                  ♡ November 1, 2026 ♡
                </div>

                <p className="timeline-signature">
                  {countdown.mode === "countdown"
                    ? "Counting down to another memory with you."
                    : "Counting every second of our forever."}
                </p>
              </div>
            </article>

            {/* CHAPTER THREE */}
            <article className="love-timeline-item">
              <div className="love-timeline-marker">
                <span>♡</span>
              </div>

              <div className="love-timeline-card">
                <p className="timeline-kicker">
                  CHAPTER THREE · OUR FOREVER
                </p>

                <h3>
                  {countdown.mode === "countdown"
                    ? "So much more love to come."
                    : "Our forever keeps growing."}
                </h3>

                <p className="timeline-date">
                  November 1, 2026 — and beyond
                </p>

                <p className="timeline-description">
                  More little adventures, more late-night talks,
                  more reasons to smile, and more memories to
                  keep close. No matter how many chapters we
                  write, you'll always be my favourite part.
                </p>

                <span className="timeline-signature">
                  I'll always choose you, Budu. ♡
                </span>
              </div>
            </article>
          </div>

          {/* CLOSING MESSAGE */}
          <footer className="love-timeline-footer">
            <span className="footer-heart">♡</span>

            <p>
              One little beginning. A lifetime of choosing you.
            </p>

            <span className="footer-caption">
              ALWAYS YOU · ALWAYS US
            </span>
          </footer>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="story-section section-pad" id="story">
        <div className="section-heading">
          <p className="eyebrow">CHAPTER ONE · JUST US</p>

          <h2>Every love story has a little magic.</h2>

          <p className="section-description">
            This is where our story lives, one beautiful memory
            at a time.
          </p>
        </div>

        <div className="story-grid">
          <div className="story-photo anniversary-photo-frame">
            <div className="anniversary-photo-inner">
              <img
                src="/anniversary-photo.jpg"
                alt="A beautiful memory from our first year together"
                className="anniversary-photo-image"
              />
            </div>

            <div className="anniversary-photo-caption">
              <span className="anniversary-caption-decoration">
                ✦ ❀ ✦
              </span>

              <p>And somehow, my favourite story became ours..</p>

              <span className="anniversary-caption-subtitle">
                ONE YEAR DOWN · A LIFETIME TO GO
              </span>
            </div>
          </div>

          <div className="story-copy">
            <span className="chapter-number">
              01 / OUR BEGINNING
            </span>

            <h3>It was never just a moment.</h3>

            <p>
              It was the little things. The conversations, the
              laughter, the unexpected happiness, and the way
              ordinary days started feeling extraordinary.
            </p>

            <p>
              This little corner of the internet is for
              everything I never want us to forget.
            </p>

            <button
              className="outline-button"
              onClick={() => goTo("memories")}
            >
              Explore our memories ↗
            </button>
          </div>
        </div>
      </section>

      {/* MEMORIES */}
      <section
        className="memories-section section-pad"
        id="memories"
      >
        <div className="section-heading">
          <p className="eyebrow">
            LITTLE PIECES OF FOREVER
          </p>

          <h2>Our memory garden.</h2>

          <p className="section-description">
            Photos, words, and songs that will always take us
            back.
          </p>
        </div>

        <div className="memory-grid">
          {memories.map((memory, index) => (
            <button
              type="button"
              className="memory-card"
              key={memory.type}
              onClick={() => {
                if (memory.type === "PHOTO") {
                  setCurrentPage("gallery");
                } else if (memory.type === "LETTER") {
                  setCurrentPage("letters");
                } else if (memory.type === "SONG") {
                  setCurrentPage("songs");
                }
              }}
            >
              <div className={`memory-art memory-art-${index + 1}`}>
                <span>{memory.icon}</span>
                <span className="memory-decoration">✧</span>
              </div>

              <div className="memory-info">
                <span className="memory-type">{memory.type}</span>
                <h3>{memory.title}</h3>
                <p>{memory.description}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="demo-note">
          These are design previews. Your real memories will
          be saved to the database after we build the memory
          manager.
        </p>

        <div className="gallery-cta">
          <button
            className="primary-button"
            onClick={() => setCurrentPage("garden")}
          >
            Enter our Memory Garden 🌷
          </button>

          <button
            className="outline-button"
            onClick={() => setCurrentPage("gallery")}
          >
            Explore our photo gallery ♡
          </button>
        </div>
      </section>

      {/* LOVE LETTER */}
      <section
        className="letter-section section-pad"
        id="letter"
      >
        <div className="letter-card">
          <span className="letter-decoration">✿</span>

          <p className="eyebrow">SEALED WITH ALL MY LOVE</p>

          <h2>To my sweetest BUDU,</h2>

          <p className="letter-preview">
            There are so many little things I want to remember
            about us. So I made this tiny world where our
            memories can stay, our story can grow, and my words
            for you never have to fade.
          </p>

          <button
            className="primary-button"
            onClick={() => setLetterOpen(true)}
          >
            Open your letter <span>♡</span>
          </button>

          <span className="letter-signature">
            Always yours ♡
          </span>
        </div>
      </section>

      {/* FUTURE */}
      <section className="future-section section-pad">
        <p className="eyebrow">
          AND THIS IS ONLY THE BEGINNING
        </p>

        <h2>More memories are waiting for us.</h2>

        <p className="section-description">
          More places. More laughter. More little moments.
          More years of choosing each other.
        </p>

        <button
          className="outline-button"
          onClick={() => goTo("story")}
        >
          Back to our story ↑
        </button>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-heart">♥</span> budu & me
        </a>

        <p>Made with love, for my BUDU. ♡</p>

        <span>OUR LITTLE FOREVER · EST. 2025</span>
      </footer>

      {/* LOVE LETTER MODAL */}
      {letterOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setLetterOpen(false)}
        >
          <article
            className="letter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="letter-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setLetterOpen(false)}
              aria-label="Close letter"
            >
              ×
            </button>

            <span className="modal-flower">✿</span>

            <p className="eyebrow">A LITTLE NOTE FOR YOU</p>

            <h2 id="letter-title">My dearest BUDU, ♡</h2>

            <p>
              If I could keep one thing forever, it would be
              all the little moments that brought us here.
            </p>

            <p>
              This is just the beginning of our memory garden.
              I want us to fill it with our photos, our silly
              moments, our favorite songs, our letters, and all
              the beautiful things still ahead.
            </p>

            <p>
              Happy first anniversary, my love. Here is to our
              story, today and all the tomorrows we get to share.
            </p>

            <p className="modal-signature">
              With all my heart, always. ♡
            </p>

            <button
              className="primary-button"
              onClick={() => setLetterOpen(false)}
            >
              Keep this moment close ♡
            </button>
          </article>
        </div>
      )}
    </main>
  );
}

export default App;
