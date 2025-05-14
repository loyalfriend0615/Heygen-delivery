import React, { useState, useRef, useEffect } from 'react';

const DEFAULT_CONFIG = {
  maxHue: 337,
  minHue: 103,
  minSaturation: 0.75,
  threshold: 1.0,
};

export default function ChromaKeyPanel() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showPanel, setShowPanel] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Only access localStorage on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromaKeyConfig');
      if (stored) setConfig(JSON.parse(stored));
    }
  }, []);

  const handleChange = (key: keyof typeof DEFAULT_CONFIG, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chromaKeyConfig', JSON.stringify(newConfig));
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chromaKeyConfig', JSON.stringify(DEFAULT_CONFIG));
    }
  };

  // Hover/focus logic with timeout for smooth UX
  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setShowPanel(true);
  };
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setShowPanel(false), 150);
  };

  return (
    <div className="relative inline-block" onMouseLeave={handleMouseLeave}>
      <button
        className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition-colors"
        tabIndex={0}
        onMouseEnter={handleMouseEnter}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        Chroma Key
      </button>
      {showPanel && (
        <div
          className="absolute right-0 bottom-12 w-80 bg-gray-900 text-white rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
          style={{ minWidth: 300 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-lg">Adjustments</span>
            <button
              className="text-gray-300 hover:text-white text-sm border border-gray-500 rounded px-2 py-1"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Max Hue: {config.maxHue.toFixed(2)}</label>
            <input type="range" min={0} max={360} step={1} value={config.maxHue} onChange={e => handleChange('maxHue', Number(e.target.value))} className="w-full accent-blue-500" />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Min Hue: {config.minHue.toFixed(2)}</label>
            <input type="range" min={0} max={360} step={1} value={config.minHue} onChange={e => handleChange('minHue', Number(e.target.value))} className="w-full accent-blue-500" />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Min Saturation: {config.minSaturation.toFixed(2)}</label>
            <input type="range" min={0} max={1} step={0.01} value={config.minSaturation} onChange={e => handleChange('minSaturation', Number(e.target.value))} className="w-full accent-blue-500" />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Threshold: {config.threshold.toFixed(2)}</label>
            <input type="range" min={0.5} max={2} step={0.01} value={config.threshold} onChange={e => handleChange('threshold', Number(e.target.value))} className="w-full accent-blue-500" />
          </div>
        </div>
      )}
    </div>
  );
} 