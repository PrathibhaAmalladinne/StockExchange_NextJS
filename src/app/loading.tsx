export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-lg text-gray-600">Loading market data...</p>
      </div>
    </div>
  )
}
