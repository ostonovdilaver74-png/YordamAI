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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(form);

    if (result.token) {
      navigate("/");
    } else {
      setError(result.message || "Kirishda xatolik");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 className="text-3xl font-bold mb-2 text-center">YordamAI</h1>
        <p className="text-center text-slate-500 mb-6">Hisobingizga kiring</p>

        {error && <div className="mb-4 bg-red-100 text-red-600 p-3 rounded-xl">{error}</div>}

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
          Kirish
        </button>

        <p className="text-center mt-5 text-sm">
          Hisob yo‘qmi? <Link className="text-blue-600" to="/register">Ro‘yxatdan o‘tish</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;