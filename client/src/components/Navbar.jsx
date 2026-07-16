import { Link } from "react-router-dom";
export default function Navbar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        <h1 className="text-2xl font-bold text-blue-600">
          🤖 YordamAI
        </h1>

        <div className="flex gap-8 text-gray-700 font-medium">
         <Link to="/">Bosh sahifa</Link>

          <Link to="/chat">AI Chat</Link>

          <Link to="/cv">CV</Link>

          <Link to="/translate">Tarjima</Link>
        </div>

       <Link
  to="/login"
  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
>
  Kirish
</Link>

      </div>
    </nav>
  );
}