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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await register(form);

    if (result.token) {
      navigate("/");
    } else {
      setError(result.message || "Ro‘yxatdan o‘tishda xatolik");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 className="text-3xl font-bold mb-2 text-center">YordamAI</h1>
        <p className="text-center text-slate-500 mb-6">Yangi hisob yarating</p>

        {error && <div className="mb-4 bg-red-100 text-red-600 p-3 rounded-xl">{error}</div>}

        <input
          type="text"
          placeholder="Ism"
          className="w-full mb-4 p-3 border rounded-xl"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 border rounded-xl"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Parol"
          className="w-full mb-4 p-3 border rounded-xl"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button className="w-full bg-slate-950 text-white p-3 rounded-xl">
          Ro‘yxatdan o‘tish
        </button>

        <p className="text-center mt-5 text-sm">
          Hisobingiz bormi? <Link className="text-blue-600" to="/login">Kirish</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;