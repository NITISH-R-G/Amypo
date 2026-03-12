import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import EvaluationResults from './pages/EvaluationResults';
import TrainerPanel from './pages/TrainerPanel';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
           <Route index element={<LandingPage />} />
           <Route path="student" element={<StudentDashboard />} />
           <Route path="results" element={<EvaluationResults />} />
           <Route path="trainer" element={<TrainerPanel />} />
           <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
