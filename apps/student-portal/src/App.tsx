import { ScoreDashboard } from './components/ScoreDashboard'
import { VisualMap } from './components/VisualMap'

// Mock Data
const MOCK_SCORE_BUCKETS = [
  { name: 'HTML Architecture', score: 100, weight: 0.2 },
  { name: 'CSS Styling', score: 95, weight: 0.2 },
  { name: 'JavaScript Logic', score: 80, weight: 0.3 },
  { name: 'Visual Regression', score: 100, weight: 0.2 },
  { name: 'Overall Quality (Accessibility, etc)', score: 90, weight: 0.1 },
]

function App() {
  return (
    <div className="min-h-screen p-8 bg-grayscale-50">
      <header className="mb-8 border-b border-grayscale-200 pb-4">
        <h1 className="text-3xl font-bold text-black">Student Portal</h1>
        <p className="text-grayscale-500">Evaluation Feedback & Visual Maps</p>
      </header>
      <main className="max-w-5xl mx-auto grid grid-cols-1 gap-8">
        <ScoreDashboard buckets={MOCK_SCORE_BUCKETS} />
        <VisualMap 
          expectedUrl="https://placehold.co/1024x800/E5E7EB/9CA3AF?text=Expected+Layout"
          actualUrl="https://placehold.co/1024x800/E5E7EB/9CA3AF?text=Actual+Submission"
          diffUrl="https://placehold.co/1024x800/FCA5A5/EF4444?text=Diff+Heatmap"
        />
      </main>
    </div>
  )
}

export default App
