import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Connectling — Private Real-Time Video & Drop-In Audio Spaces';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const iconPath = path.join(process.cwd(), 'public/icon-512.png');
  const iconBase64 = fs.readFileSync(iconPath).toString('base64');
  const iconSrc = `data:image/png;base64,${iconBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#060608',
          backgroundImage:
            'radial-gradient(circle at 50% 32%, rgba(255, 153, 51, 0.22) 0%, rgba(255, 107, 0, 0.08) 45%, rgba(6, 6, 8, 0) 75%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '40px',
        }}
      >
        {/* Subtle Frame */}
        <div
          style={{
            position: 'absolute',
            inset: '16px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <img
            src={iconSrc}
            width={160}
            height={160}
            style={{
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 30px rgba(255, 153, 51, 0.35))',
            }}
            alt="Connectling Logo"
          />
        </div>

        {/* Brand Name */}
        <div
          style={{
            fontSize: '60px',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginBottom: '10px',
            color: '#fcfdff',
          }}
        >
          Connectling
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '25px',
            color: '#9ba1a6',
            marginBottom: '42px',
            letterSpacing: '-0.01em',
            textAlign: 'center',
          }}
        >
          Private Real-Time Video &amp; Drop-In Audio Spaces
        </div>

        {/* Feature Badges */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '14px',
              fontWeight: 500,
              color: '#f1f5f9',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                marginRight: '8px',
              }}
            />
            Zero Data Retention
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '14px',
              fontWeight: 500,
              color: '#f1f5f9',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#FF9933',
                marginRight: '8px',
              }}
            />
            Peer-to-Peer WebRTC
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '14px',
              fontWeight: 500,
              color: '#f1f5f9',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#38bdf8',
                marginRight: '8px',
              }}
            />
            Zero Recordings
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
