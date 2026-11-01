
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import SignIn from "./SignIn";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      setSession(error ? null : data.session);
      setChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) {
        setSession(newSession);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <main className="budu-signin-page">
        <p>Opening our little world… ♡</p>
      </main>
    );
  }

  if (!session) {
    return <SignIn />;
  }

  return children;
}
