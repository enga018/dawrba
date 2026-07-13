'use client'

interface AmountKeypadProps {
  value: string
  onChange: (next: string) => void
  maxLength?: number
}

/* Phone-style numeric keypad for entering amounts
   Traditional 3×4 layout (1-9, C, 0, ⌫)
   No leading zeros, simple amount entry */
export default function AmountKeypad({ value, onChange, maxLength = 7 }: AmountKeypadProps) {
  const press = (digit: string) => {
    if (value.length >= maxLength) return
    if (value === '' && digit === '0') return
    onChange(value + digit)
  }

  const backspace = () => onChange(value.slice(0, -1))
  const clear = () => onChange('')

  // Phone keypad layout: 3 columns × 4 rows
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫'],
  ]

  return (
    <div className="keypad-grid">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="keypad-row">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className={`keypad-btn ${key === 'C' || key === '⌫' ? 'keypad-btn-action' : ''}`}
              onClick={() => {
                if (key === 'C') clear()
                else if (key === '⌫') backspace()
                else press(key)
              }}
              aria-label={key === '⌫' ? 'Delete' : key === 'C' ? 'Clear' : key}
            >
              {key === '⌫' ? <i className="fa-solid fa-delete-left"></i> : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
