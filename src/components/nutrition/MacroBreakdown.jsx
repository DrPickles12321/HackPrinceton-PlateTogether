export default function MacroBreakdown({ macros, calories }) {
  const protein = macros.protein_g || 0
  const carbs   = macros.carbs_g   || 0
  const fat     = macros.fat_g     || 0
  const fiber   = macros.fiber_g   || 0
  const totalGrams = protein + carbs + fat
  const safe = totalGrams > 0 ? totalGrams : 1

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold">Macronutrients</span>
        <span className="text-xs text-gray-500">{calories} kcal</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden flex mb-2 bg-gray-100">
        <div style={{ width: `${Math.min(100, protein / safe * 100)}%` }} className="bg-red-400 h-full" title={`Protein: ${protein}g`} />
        <div style={{ width: `${Math.min(100, carbs   / safe * 100)}%` }} className="bg-amber-400 h-full" title={`Carbs: ${carbs}g`} />
        <div style={{ width: `${Math.min(100, fat     / safe * 100)}%` }} className="bg-yellow-300 h-full" title={`Fat: ${fat}g`} />
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: 'Protein', value: protein, color: 'text-red-600' },
          { label: 'Carbs',   value: carbs,   color: 'text-amber-600' },
          { label: 'Fat',     value: fat,     color: 'text-yellow-600' },
          { label: 'Fiber',   value: fiber,   color: 'text-gray-600' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className={`text-sm font-semibold ${color}`}>{value}g</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
