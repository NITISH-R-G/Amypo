import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import EvaluationResults from './pages/EvaluationResults';
import TrainerPanel from './pages/TrainerPanel';
import AdminDashboard from './pages/AdminDashboard';
import SubmissionsPage from './pages/SubmissionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
           <Route index element={<Dashboard />} />
           <Route path="welcome" element={<LandingPage />} />
           <Route path="student" element={<StudentDashboard />} />
           <Route path="results" element={<EvaluationResults />} />
           <Route path="results/:id" element={<EvaluationResults />} />
           <Route path="trainer" element={<TrainerPanel />} />
           <Route path="admin" element={<AdminDashboard />} />
           <Route path="submissions" element={<SubmissionsPage />} />
           <Route path="analytics" element={<AnalyticsPage />} />
           <Route path="settings" element={<SettingsPage />} />
           <Route path="*" element={<LandingPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
