import { BrowserRouter, Routes, Route } from "react-router";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Arena from "./pages/Arena";
import GameLanding from "./pages/GameLanding";
import HostLobby from "./pages/HostLobby";
import Join from "./pages/Join";
import Play from "./pages/Play";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/arena/:gameId" element={<GameLanding />} />
          <Route path="/arena/:gameId/host/:code" element={<HostLobby />} />
          <Route path="/join" element={<Join />} />
          <Route path="/play/:code" element={<Play />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
