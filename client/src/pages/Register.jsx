import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
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

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name || !email || !password) {
      setError("Barcha maydonlarni to‘ldiring");
      return;
    }

    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo‘lsin");
      return;
    }

    setSubmitting(true);

    try {
      const result = await register({
        name,
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
        result?.message ||
          "Ro‘yxatdan o‘tishda xatolik yuz berdi"
      );
    } catch (requestError) {
      console.error(
        "REGISTER FRONTEND XATOSI:",
        requestError
      );

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
          Yangi hisob yarating
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
          htmlFor="register-name"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Ism
        </label>

        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Ismingiz"
          className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
          value={form.name}
          onChange={handleChange}
          disabled={submitting}
          required
        />

        <label
          htmlFor="register-email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email
        </label>

        <input
          id="register-email"
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
          htmlFor="register-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Parol
        </label>

        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Kamida 6 ta belgi"
          className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
          value={form.password}
          onChange={handleChange}
          disabled={submitting}
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-slate-950 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Ro‘yxatdan o‘tilmoqda..."
            : "Ro‘yxatdan o‘tish"}
        </button>

        <p className="mt-5 text-center text-sm">
          Hisobingiz bormi?{" "}
          <Link
            className="text-blue-600 hover:underline"
            to="/login"
          >
            Kirish
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;