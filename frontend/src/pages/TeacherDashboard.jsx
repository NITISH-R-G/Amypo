import { useState, useEffect } from 'react';
import { Plus, BookOpen, FileCode, CheckCircle2, ChevronRight, Settings2, Trash2, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd fetch courses from /api/courses
    // For now, let's fetch questions and group them by course if we had course logic
    const loadCourses = async () => {
      try {
        const res = await fetch('/api/questions');
        const data = await res.json();
        const questions = data.questions || [];
        
        // Mock grouping into a course for the demo
        setCourses([{
          id: 1,
          title: "Modern Frontend Fundamentals",
          questions: questions,
          studentCount: 42,
          avgScore: 84
        }]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Teacher Portal</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your curriculum and student assessments</p>
        </div>
        <button 
          onClick={() => navigate('/teacher/editor')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5"
        >
          <Plus size={20} /> Create Question
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid gap-8">
          {courses.map(course => (
            <section key={course.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>
                    <p className="text-sm text-gray-500 font-medium">{course.questions.length} Questions • {course.studentCount} Students Enrolled</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">
                     <Settings2 size={20} />
                   </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-4">Question</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Submissions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {course.questions.map((q, idx) => (
                      <motion.tr 
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                              <FileCode size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{q.title}</div>
                              <div className="text-xs text-gray-500">Order: {idx + 1}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={12} /> Live
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-gray-600">--</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => navigate(`/teacher/editor/${q.id}`)}
                               className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                             >
                               <Edit3 size={18} />
                             </button>
                             <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                               <Trash2 size={18} />
                             </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-gray-50/30 border-t border-gray-50">
                <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-indigo-300 hover:text-indigo-500 font-bold transition-all flex items-center justify-center gap-2">
                  <Plus size={18} /> Add Module to Course
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
