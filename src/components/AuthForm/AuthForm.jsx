// src/components/AuthForm/AuthForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ⬅️ import navigate
import { supabase } from "../../supabase/supabaseClient";
import "./AuthForm.css";

const AuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ⬅️ hook for routing

  // 🔹 Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Redirect after success
      navigate("/"); // ⬅️ go to homepage
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      alert("Signup successful! Please check your email for confirmation.");
      // optional: redirect to login
      setMode("login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert("Password reset link sent! Check your email.");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">
        {mode === "login" && "Login"}
        {mode === "signup" && "Sign Up"}
        {mode === "forgot" && "Reset Password"}
      </h2>

      <form
        onSubmit={
          mode === "login"
            ? handleLogin
            : mode === "signup"
            ? handleSignup
            : handleForgotPassword
        }
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
          required
        />

        {mode !== "forgot" && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
        )}

        <button type="submit" className="auth-button" disabled={loading}>
          {loading
            ? "Processing..."
            : mode === "login"
            ? "Login"
            : mode === "signup"
            ? "Sign Up"
            : "Send Reset Link"}
        </button>
      </form>

      <div className="auth-switch">
        {mode === "login" && (
          <>
            <p>
              Don’t have an account?{" "}
              <button onClick={() => setMode("signup")}>Sign Up</button>
            </p>
            <p>
              Forgot password?{" "}
              <button onClick={() => setMode("forgot")}>Reset</button>
            </p>
          </>
        )}

        {mode === "signup" && (
          <p>
            Already have an account?{" "}
            <button onClick={() => setMode("login")}>Login</button>
          </p>
        )}

        {mode === "forgot" && (
          <p>
            Remembered your password?{" "}
            <button onClick={() => setMode("login")}>Back to Login</button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
