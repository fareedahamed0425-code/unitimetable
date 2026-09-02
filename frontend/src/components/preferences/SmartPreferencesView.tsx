import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Users,
  GraduationCap,
  Building,
  Scale
} from 'lucide-react';
import { api } from '../../api';
import { PreferenceProfile, SmartPreferenceRule } from '../../../../shared/types';

export const SmartPreferencesView: React.FC = () => {
  const [profiles, setProfiles] = useState<PreferenceProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('prof-balanced');
  const [promptText, setPromptText] = useState<string>('');
  const [interpretedRules, setInterpretedRules] = useState<SmartPreferenceRule[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const data = await api.getPreferenceProfiles();
    setProfiles(data);
    if (data.length > 0) {
      const def = data.find(p => p.isDefault) || data[0];
      setSelectedProfileId(def.id);
      setInterpretedRules(def.rules);
    }
  };

  const handleSelectProfile = (pId: string) => {
    setSelectedProfileId(pId);
    const prof = profiles.find(p => p.id === pId);
    if (prof) {
      setInterpretedRules(prof.rules);
      if (prof.nlPrompt) setPromptText(prof.nlPrompt);
    }
  };

  const handleParseNLP = async () => {
    if (!promptText.trim()) return;
    setIsParsing(true);
    try {
      const res = await api.parseNlPreferences(promptText);
      setInterpretedRules(res.interpretedRules);
    } catch (err) {
      console.error('NLP error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleWeightChange = (ruleId: string, weight: number) => {
    setInterpretedRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, weight, priority: weight >= 90 ? 'VERY_HIGH' : weight >= 75 ? 'HIGH' : weight >= 50 ? 'MEDIUM' : 'LOW' } : r))
    );
  };

  const handleToggleRule = (ruleId: string) => {
    setInterpretedRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const categories = [
    { key: 'STUDENT', label: 'Student Cohort Rules', icon: GraduationCap },
    { key: 'TEACHER', label: 'Faculty & Teacher Rules', icon: Users },
    { key: 'ROOM', label: 'Venue & Infrastructure', icon: Building },
    { key: 'UNIVERSITY', label: 'Institutional Governance', icon: Scale }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
              Optimization Engine
            </span>
            <h1 className="text-2xl font-bold text-[#121316] tracking-tight">Smart Timetable Preferences</h1>
            <p className="text-xs text-[#575A65]">
              Define objective weights via natural language prompts or granular constraint sliders.
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Preset Profiles Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {profiles.map(p => (
          <div
            key={p.id}
            onClick={() => handleSelectProfile(p.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedProfileId === p.id
                ? 'border-[#121316] bg-[#FAF9F7] shadow-xs'
                : 'border-[#E8E7E3] bg-white hover:border-[#8B8E99]'
            }`}
          >
            <div className="text-xs font-bold text-[#121316]">{p.name}</div>
            <div className="text-[11px] text-[#575A65] mt-1 leading-snug">{p.description}</div>
          </div>
        ))}
      </div>

      {/* Natural Language Studio */}
      <div className="lux-card p-6 space-y-4 border-[#E8E7E3] bg-[#FAF9F7]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Natural Language Studio
          </h2>
          <p className="text-xs text-[#8B8E99] mt-0.5">
            Type your academic requirements and the NLP engine will parse entities, constraints, and weights automatically.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            placeholder="e.g. Keep classes between 9 AM and 4 PM, minimize student gaps, afternoon labs, max 3 consecutive teacher lectures..."
            className="lux-input text-xs leading-relaxed bg-white"
          />

          <div className="flex justify-end">
            <button
              onClick={handleParseNLP}
              disabled={isParsing}
              className="lux-btn lux-btn-primary text-xs py-2 px-5 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isParsing ? 'Parsing...' : 'Interpret & Update Rules'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categorized Preferences Matrix */}
      <div className="space-y-5">
        {categories.map(cat => {
          const catRules = interpretedRules.filter(r => r.category === cat.key);
          const Icon = cat.icon;

          return (
            <div key={cat.key} className="lux-card p-5 space-y-4">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#E8E7E3]">
                <div className="w-6 h-6 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[#121316] uppercase tracking-wider">{cat.label}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catRules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-lg border transition-all ${
                      rule.isEnabled ? 'border-[#E8E7E3] bg-white shadow-2xs' : 'border-[#E8E7E3] bg-[#FAF9F7] opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#121316]">{rule.name}</span>
                          <span className="badge badge-primary text-[9px]">
                            {rule.priority} ({rule.weight}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-[#575A65] mt-1">{rule.description}</p>
                      </div>

                      <input
                        type="checkbox"
                        checked={rule.isEnabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="w-4 h-4 accent-[#121316] rounded cursor-pointer mt-1"
                      />
                    </div>

                    {rule.isEnabled && (
                      <div className="mt-3 pt-3 border-t border-[#F0EFEA] space-y-1">
                        <div className="flex justify-between text-[9px] text-[#8B8E99] font-bold uppercase tracking-wider">
                          <span>Low (25%)</span>
                          <span>Medium (50%)</span>
                          <span>High (75%)</span>
                          <span>Critical (90%)</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="95"
                          step="5"
                          value={rule.weight}
                          onChange={e => handleWeightChange(rule.id, parseInt(e.target.value, 10))}
                          className="w-full h-1 bg-[#EAE8E4] rounded-lg appearance-none cursor-pointer accent-[#121316]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartPreferencesView;
