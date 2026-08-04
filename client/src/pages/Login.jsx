import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError("Email va parolni kiriting");
      return;
    }

    setSubmitting(true);

    try {
      const result = await login({
        email,
        password,
      });

      if (result?.token) {
        navigate("/", {
          replace: true,
        });
        return;
      }

      setError(
        result?.message || "Kirishda xatolik yuz berdi"
      );
    } catch (requestError) {
      console.error("LOGIN FRONTEND XATOSI:", requestError);

      setError(
        requestError?.message ||
          "Server bilan bog‘lanishda xatolik yuz berdi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow"
      >
        <h1 className="mb-2 text-center text-3xl font-bold">
          YordamAI
        </h1>

        <p className="mb-6 text-center text-slate-500">
          Hisobingizga kiring
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-100 p-3 text-red-700"
          >
            {error}
          </div>
        )}

        <label
          htmlFor="login-email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email
        </label>

        <input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="email@example.com"
          className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
          value={form.email}
          onChange={handleChange}
          disabled={submitting}
          required
        />

        <label
          htmlFor="login-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Parol
        </label>

        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Parolingiz"
          className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
          value={form.password}
          onChange={handleChange}
          disabled={submitting}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-slate-950 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Kirilmoqda..." : "Kirish"}
        </button>

        <p className="mt-5 text-center text-sm">
          Hisob yo‘qmi?{" "}
          <Link
            className="text-blue-600 hover:underline"
            to="/register"
          >
            Ro‘yxatdan o‘tish
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;