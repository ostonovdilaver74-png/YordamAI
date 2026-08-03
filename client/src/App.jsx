import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Pricing from "./pages/Pricing";
import CV from "./pages/CV";
import Translate from "./pages/Translate";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <Routes>

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >

        <Route
          path="/"
          element={
            <Navigate
              to="/chat"
              replace
            />
          }
        />

        <Route
          path="/chat"
          element={<Chat />}
        />

        <Route
          path="/pricing"
          element={<Pricing />}
        />

        <Route
          path="/cv"
          element={<CV />}
        />

        <Route
          path="/translate"
          element={<Translate />}
        />

      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/chat"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;