import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import Layout from "./components/Layout";
import RequireTeacher from "./components/RequireTeacher";
import Landing from "./pages/Landing";
import Arena from "./pages/Arena";
import GameLanding from "./pages/GameLanding";
import HostLobby from "./pages/HostLobby";
import Demo from "./pages/Demo";
import Review from "./pages/Review";
import ReviewSession from "./pages/ReviewSession";
import Join from "./pages/Join";
import Play from "./pages/Play";
import Login from "./pages/Login";

/**
 * A stage on its own, with no server and no lobby — see pages/Preview.tsx.
 *
 * Lazy and behind `import.meta.env.DEV` so that the production build drops
 * both the page and the question generator it pulls in from server/.
 */
const Preview = import.meta.env.DEV ? lazy(() => import("./pages/Preview")) : null;

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/arena/:gameId" element={<GameLanding />} />
          <Route
            path="/arena/:gameId/host/:code"
            element={
              <RequireTeacher>
                <HostLobby />
              </RequireTeacher>
            }
          />
          <Route
            path="/arena/:gameId/demo/:code"
            element={
              <RequireTeacher>
                <Demo />
              </RequireTeacher>
            }
          />
          <Route
            path="/review"
            element={
              <RequireTeacher>
                <Review />
              </RequireTeacher>
            }
          />
          <Route
            path="/review/:sessionId"
            element={
              <RequireTeacher>
                <ReviewSession />
              </RequireTeacher>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<Join />} />
          <Route path="/play/:code" element={<Play />} />
          {Preview && (
            <Route
              path="/preview/:gameId?/:stageId?"
              element={
                <Suspense fallback={null}>
                  <Preview />
                </Suspense>
              }
            />
          )}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
