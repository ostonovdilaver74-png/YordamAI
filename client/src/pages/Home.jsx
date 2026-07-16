import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-8 bg-slate-100">
      <Card className="max-w-4xl w-full text-center">

        <h1 className="text-6xl font-bold text-blue-600">
          🤖 YordamAI
        </h1>

        <p className="mt-6 text-xl text-gray-600">
          O'zbek tilidagi zamonaviy sun'iy intellekt platformasi
        </p>

        <div className="mt-10 flex justify-center gap-4">

          <Button>
            🚀 Chatni boshlash
          </Button>

          <Button variant="outline">
            📖 Batafsil
          </Button>

        </div>

        <div className="grid grid-cols-3 gap-5 mt-12">

          <Card>
            <h2 className="font-bold text-lg">🤖 AI Chat</h2>
            <p className="text-gray-500 mt-2">
              Sun'iy intellekt bilan suhbat.
            </p>
          </Card>

          <Card>
            <h2 className="font-bold text-lg">📄 CV</h2>
            <p className="text-gray-500 mt-2">
              Professional CV yaratish.
            </p>
          </Card>

          <Card>
            <h2 className="font-bold text-lg">🌍 Tarjima</h2>
            <p className="text-gray-500 mt-2">
              Tez va aniq tarjima.
            </p>
          </Card>

        </div>

      </Card>
    </div>
  );
}