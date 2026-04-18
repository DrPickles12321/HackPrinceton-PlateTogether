import { useMemo } from 'react'
import { computeSupplementRecommendations } from '../lib/insights'

export default function SupplementChecklist({ mealSlots, foodItems, selectedDay, checkedSupplements, onToggleChecked }) {
  const recommendations = useMemo(
    () => computeSupplementRecommendations({ mealSlots: mealSlots.filter(slot => slot.day === selectedDay), foodItems }),
    [mealSlots, foodItems, selectedDay]
  )

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplements</h3>
        <p className="text-xs text-gray-600">No recommendations</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplements</h3>
      <div className="space-y-2">
        {recommendations.map((rec, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={checkedSupplements.has(rec.nutrient)}
              onChange={() => onToggleChecked(rec.nutrient)}
            />
            <span className="text-xs text-gray-700">{rec.nutrient}</span>
          </div>
        ))}
      </div>
    </div>
  )
}