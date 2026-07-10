'use client'

interface AmountKeypadProps {
  value: string
  onChange: (next: string) => void
  maxLength?: number
}

/* On-screen numeric keypad for entering a rupee amount. Stores the raw
   digit string (no leading zeros, no decimals) and hands it back via
   onChange. Used by the Add Credit flow. */
export default function AmountKeypad({ value, onChange, maxLength = 7 }: AmountKeypadProps) {
  const press = (digit: string) => {
    if (value.length >= maxLength) return
    // No leading zeros: pressing 0 on an empty amount is a no-op.
    if (value === '' && digit === '0') return
    onChange(value + digit)
  }

  const backspace = () => onChange(value.slice(0, -1))
  const clear = () => onChange('')

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="keypad">
      {digits.map((d) => (
        <button key={d} type="button" className="keypad-key" onClick={() => press(d)}>
          {d}
        </button>
      ))}
      <button type="button" className="keypad-key keypad-key-muted" onClick={clear} aria-label="Clear">
        C
      </button>
      <button type="button" className="keypad-key" onClick={() => press('0')}>
        0
      </button>
      <button type="button" className="keypad-key keypad-key-muted" onClick={backspace} aria-label="Delete">
        <i className="fa-solid fa-delete-left"></i>
      </button>
    </div>
  )
}
