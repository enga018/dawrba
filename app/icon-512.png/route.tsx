import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white',
          fontSize: 290,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        D
      </div>
    ),
    { width: 512, height: 512 }
  )
}
