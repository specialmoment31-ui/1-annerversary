
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./SignIn.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        "We couldn't sign you in. Check your email and password, and confirm your email if required."
      );
    }

    setLoading(false);
  }

  return (
    <main className="budu-signin-page">
      <section className="budu-signin-card">
        <p className="budu-signin-eyebrow">A LITTLE PLACE JUST FOR US</p>
        <h1>BUDU <span>&</span> ME</h1>
        <p className="budu-signin-subtitle">Our Little Forever ♡</p>

        <div className="budu-signin-divider">✦</div>

        <h2>Come back to our story</h2>
        <p className="budu-signin-description">
          Sign in to revisit the little moments that mean everything.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="budu-email">Email address</label>
          <input
            id="budu-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <label htmlFor="budu-password">Password</label>
          <input
            id="budu-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
          />

          {error && <p className="budu-signin-error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Opening our little world..." : "Enter our memory book ♡"}
          </button>
        </form>

        <p className="budu-signin-footnote">
          A private space for two. Please keep your password safe.
        </p>
      </section>
    </main>
  );
}
