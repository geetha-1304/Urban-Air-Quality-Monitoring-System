import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { aqiTone, getAQICategory } from '../utils/aqi';

export const Skyline = () => (
  <svg className="skyline" viewBox="0 0 600 120" preserveAspectRatio="xMaxYMax slice" aria-hidden>
    <g fill="#8fb4cf" opacity=".45">
      {[[10,50,22],[40,30,18],[66,58,26],[100,20,20],[130,44,24],[168,36,18],[420,40,22],[450,22,20],[480,52,26],[520,34,18],[550,48,24]].map(([x,y,w],i)=><rect key={i} x={x} y={y} width={w} height={120-y}/>)}
    </g>
    <g fill="#b04a3f"><rect x="215" y="50" width="150" height="70"/><rect x="255" y="8" width="26" height="112"/><polygon points="255,8 268,-6 281,8"/></g>
    <circle cx="268" cy="34" r="7" fill="#f4e9d8"/>
  </svg>
);

export const Badge = ({ aqi, tint }: { aqi: number; tint?: boolean }) => (
  <span className={`badge tone-${aqiTone(aqi)} ${tint ? 'tint' : ''}`}>{getAQICategory(aqi).label}</span>
);

export const StationPhoto = ({ id }: { id: number }) => {
  const [failed, setFailed] = useState(false);
  const photoSources: Record<number, string> = {
    1: '/stations/1.jpg',
    2: '/stations/2.jpg',
    3: '/stations/3.jpg',
    4: '/stations/4.jpg',
    5: '/stations/5.jpg',
    6: '/stations/6.jpg',
    7: '/stations/royapuram-bus-stand.png',
    8: '/stations/manali-industry.png',
    9: '/stations/kodungaiyur-metro.png',
    10: '/stations/thiruvottiyur-temple.png',
    11: '/stations/3.jpg',
    12: '/stations/4.jpg',
    13: '/stations/guindy-national-park.png',
    14: '/stations/6.jpg',
    15: '/stations/nungambakkam-metro.png',
  };
  const photoPositions = ['50%', '25%', '75%', '35%', '65%', '20%', '80%', '45%', '60%', '30%', '70%', '40%', '85%', '15%', '55%'];
  const photoFilters = [
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'saturate(1.15) contrast(1.05)',
    'brightness(1.08) saturate(1.12)',
    'sepia(.12) saturate(1.2)',
    'hue-rotate(12deg) saturate(1.18)',
    'brightness(.96) contrast(1.12) saturate(1.12)',
    'hue-rotate(-10deg) saturate(1.2)',
    'brightness(1.05) contrast(1.08)',
    'sepia(.08) hue-rotate(18deg) saturate(1.2)',
    'brightness(.92) contrast(1.16) saturate(1.1)',
  ];
  const photoStyle = {
    objectPosition: `${photoPositions[(id - 1) % photoPositions.length]} center`,
    filter: photoFilters[(id - 1) % photoFilters.length],
  };
  return failed
    ? <div className="photo ph city-photo" style={{ backgroundPosition: `${(id * 17) % 100}% 64%` }}><Landmark size={25} /></div>
    : <img className="photo" src={photoSources[id] ?? '/images/chennai-waterfront.png'} alt="" style={photoStyle} onError={() => setFailed(true)} />;
};

export const State = ({ children, error }: { children: React.ReactNode; error?: boolean }) => (
  <div className={`state ${error ? 'error' : ''}`}>{children}</div>
);
