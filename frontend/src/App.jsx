import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CSQuizMaster from './pages/CSQuizMaster';
import QuizPage from './pages/QuizPage';
import AIStudy from './pages/AIStudy';
import AIFlashcardsPractice from './pages/AIFlashcardsPractice';
import AIQuizPractice from './pages/AIQuizPractice';
import WorkspaceChat from './pages/WorkspaceChat';
import StudyPlanner from './pages/StudyPlanner';

/**
 * PrivateRoute Component
 * Checks for a JWT token in localStorage.
 * If found, it renders the page; otherwise, it redirects to login.
 */
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <Router>
            <Routes>
                {/* --- Public Routes --- */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* --- Protected Routes --- */}
                <Route
                    path="/dashboard"
                    element={<PrivateRoute><Dashboard /></PrivateRoute>}
                />

                <Route
                    path="/cs-quiz-master"
                    element={<PrivateRoute><CSQuizMaster /></PrivateRoute>}
                />

                <Route
                    path="/quiz/:subjectId"
                    element={<PrivateRoute><QuizPage /></PrivateRoute>}
                />

                <Route
                    path="/ai-upload"
                    element={<PrivateRoute><AIStudy /></PrivateRoute>}
                />

                <Route
                    path="/workspace-chat"
                    element={<PrivateRoute><WorkspaceChat /></PrivateRoute>}
                />

                <Route
                    path="/study-planner"
                    element={<PrivateRoute><StudyPlanner /></PrivateRoute>}
                />

                <Route
                    path="/ai-practice/flashcards"
                    element={<PrivateRoute><AIFlashcardsPractice /></PrivateRoute>}
                />

                <Route
                    path="/ai-practice/quiz"
                    element={<PrivateRoute><AIQuizPractice /></PrivateRoute>}
                />

                {/* --- Default Redirects --- */}
                {/* If the user hits the root, send them to login */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* 404 Catch-all: Send logged-in users to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
