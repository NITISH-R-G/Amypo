import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { AuthoringInterface } from './components/AuthoringInterface'
import { MLOpsDashboard } from './components/MLOpsDashboard'

function App() {
  return (
    <div className="min-h-screen p-8 bg-grayscale-50">
      <header className="mb-8 border-b border-grayscale-200 pb-4">
        <h1 className="text-3xl font-bold text-black">Teacher Portal</h1>
        <p className="text-grayscale-500">Cohort Analytics & Authoring Configuration</p>
      </header>
      <main className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsDashboard />
          <AuthoringInterface />
        </div>
        <MLOpsDashboard />
      </main>
    </div>
  )
}

export default App
