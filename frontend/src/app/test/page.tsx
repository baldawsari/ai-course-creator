export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-500 p-8">
      <h1 className="text-4xl font-bold text-white">Tailwind Test</h1>
      <div className="mt-4 p-4 bg-white rounded-lg shadow-lg">
        <p className="text-gray-800">If you see a blue background, white title, and this card with shadow, Tailwind is working!</p>
        <button className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Test Button
        </button>
      </div>
    </div>
  )
}