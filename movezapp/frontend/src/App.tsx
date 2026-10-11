import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Today from "./pages/Today";
import StartWorkout from "./pages/StartWorkout";
import LogActivity from "./pages/LogActivity";
import History from "./pages/History";
import ExerciseDetail from "./pages/ExerciseDetail";
import Progress from "./pages/Progress";
import "./App.css";

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <div className="app-shell">
                <NavBar />
                <main className="app-main">
                    <Routes>
                        <Route path="/" element={<Navigate to="/today" replace />} />
                        <Route path="/today" element={<Today />} />
                        <Route path="/start" element={<StartWorkout />} />
                        <Route path="/activity" element={<LogActivity />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/progress" element={<Progress />} />
                        <Route path="/exercise/:id" element={<ExerciseDetail />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
};

export default App;
