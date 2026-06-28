import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/AuthLogin'));
const Register = lazy(() => import('./pages/AuthRegister'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CSQuizMaster = lazy(() => import('./pages/CSQuizMaster'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const AIStudy = lazy(() => import('./pages/AIStudy'));
const AIFlashcardsPractice = lazy(() => import('./pages/AIFlashcardsPractice'));
const AIQuizPractice = lazy(() => import('./pages/AIQuizPractice'));
const WorkspaceChat = lazy(() => import('./pages/WorkspaceChat'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

/**
 * PrivateRoute Component
 * Checks for a JWT token in localStorage.
 * If found, it renders the page; otherwise, it redirects to login.
 */
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return token && role === 'admin' ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <Router>
            <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-300 bg-[#040611]">Loading AskNLearn...</div>}>
                <Routes>
                    {/* --- Public Routes --- */}
                    <Route
                        path="/leaderboard"
                        element={<PrivateRoute><Leaderboard /></PrivateRoute>}
                    />

                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* --- Protected Admin Routes --- */}
                    <Route
                        path="/admin-dashboard"
                        element={<AdminRoute><AdminDashboard /></AdminRoute>}
                    />

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
            </Suspense>
        </Router>
    );
}

export default App;
