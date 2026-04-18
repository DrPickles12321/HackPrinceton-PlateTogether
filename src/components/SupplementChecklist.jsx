import { useMemo } from 'react'
import { computeSupplementRecommendations } from '../lib/insights'

export default function SupplementChecklist({ mealSlots, foodItems }) {
  const recommendations = useMemo(
    () => computeSupplementRecommendations({ mealSlots, foodItems }),
    [mealSlots, foodItems]
  )

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplement Recommendations</h3>
        <p className="text-gray-600">No specific recommendations at this time. Continue monitoring nutrition intake.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplement Recommendations</h3>
      <p className="text-sm text-gray-600 mb-6">
        Based on current nutrition intake, here are recommended supplements for recovery support.
        Consult with the treatment team before starting any supplements.
      </p>

      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              defaultChecked={false}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{rec.nutrient}</h4>
                {rec.current !== null && (
                  <span className="text-sm text-gray-500">
                    Current: {rec.current} / {rec.recommended} weekly
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-600 font-medium mt-1">{rec.supplement}</p>
              <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> These are general recommendations based on nutrition data.
          Individual needs vary. Always consult healthcare providers before starting supplements,
          as they can interact with medications and affect lab results.
        </p>
      </div>
    </div>
  )
}