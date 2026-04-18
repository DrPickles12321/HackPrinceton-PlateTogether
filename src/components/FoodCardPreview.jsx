const BORDER = { familiar: 'border-l-green-500', working_on: 'border-l-yellow-500', challenge: 'border-l-red-500' }

export default function FoodCardPreview({ name, category, floating = false }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 px-3 py-2 text-sm text-gray-900 ${BORDER[category] || 'border-l-gray-400'} ${floating ? 'shadow-2xl rotate-2 scale-105 cursor-grabbing' : ''}`}>
      {name}
    </div>
  )
}
