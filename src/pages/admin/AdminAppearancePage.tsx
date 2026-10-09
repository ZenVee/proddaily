import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { getSiteTheme, setSiteTheme } from '@/state/ThemeContext';
import { ACCENT_PRESETS, ACCENT_ORDER, isValidHex } from '@/utils/theme';
import { cn } from '@/utils/helpers';
import type { AccentPreset } from '@/types';
import { Check, RotateCcw, Eye } from 'lucide-react';

export function AdminAppearancePage() {
  const { theme, setPreset, setCustomHex, restoreDefaults } = useTheme();
  const { toast } = useToast();
  const [customHexInput, setCustomHexInput] = useState(theme.customHex);
  const [selectedPreset, setSelectedPreset] = useState<AccentPreset>(theme.preset);

  function handlePresetSelect(preset: AccentPreset) {
    setSelectedPreset(preset);
    setPreset(preset);
    if (preset !== 'custom') {
      // Also update site default
      const opt = ACCENT_PRESETS[preset];
      setSiteTheme({ preset, primary: opt.primary, secondary: opt.secondary, customHex: theme.customHex });
    }
  }

  function handleCustomHex() {
    if (!isValidHex(customHexInput)) {
      toast('Enter a valid 6-digit hex color (e.g. #D4B896).', 'error');
      return;
    }
    setSelectedPreset('custom');
    setCustomHex(customHexInput);
    setSiteTheme({ preset: 'custom', primary: customHexInput, secondary: customHexInput, customHex: customHexInput });
    toast('Custom accent applied.', 'success');
  }

  function handleRestoreDefaults() {
    restoreDefaults();
    setSelectedPreset('tan');
    setCustomHexInput('#D4B896');
    setSiteTheme({ preset: 'tan', primary: '#D4B896', secondary: '#BFA582', customHex: '#D4B896' });
    toast('Defaults restored.', 'info');
  }

  const siteDefault = getSiteTheme();

  return (
    <AdminLayout current="Appearance">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-proddaily-text mb-1">Appearance</h1>
        <p className="text-sm text-proddaily-text-2">
          Set the site-wide default accent color. Visitors can still choose their own preference.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accent selection */}
        <Card className="p-5">
          <h2 className="font-serif text-xl text-proddaily-text mb-4">Accent Color</h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {ACCENT_ORDER.map((presetId) => {
              const opt = ACCENT_PRESETS[presetId];
              const isSelected = selectedPreset === presetId;
              return (
                <button
                  key={presetId}
                  onClick={() => handlePresetSelect(presetId)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-street border transition-colors',
                    isSelected ? 'pd-accent-border bg-proddaily-bg-2' : 'border-proddaily-border hover:border-proddaily-border'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border-2 flex items-center justify-center',
                      isSelected && 'pd-accent-ring'
                    )}
                    style={{ backgroundColor: opt.primary, borderColor: isSelected ? opt.primary : '#383838' }}
                  >
                    {isSelected && <Check size={16} className="text-proddaily-bg" />}
                  </div>
                  <span className="text-xs text-proddaily-text-2">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom hex */}
          <div className="border-t border-proddaily-border pt-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Custom HEX"
                  value={customHexInput}
                  onChange={(e) => setCustomHexInput(e.target.value)}
                  placeholder="#D4B896"
                />
              </div>
              <Button onClick={handleCustomHex} variant="secondary">
                Apply
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div
                className="w-6 h-6 rounded border border-proddaily-border"
                style={{ backgroundColor: theme.primary }}
              />
              <span className="text-xs text-proddaily-text-2">
                Current: {theme.primary}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-proddaily-border">
            <Button variant="ghost" onClick={handleRestoreDefaults}>
              <RotateCcw size={16} /> Restore Defaults
            </Button>
          </div>
        </Card>

        {/* Live preview */}
        <Card className="p-5">
          <h2 className="font-serif text-xl text-proddaily-text mb-4 flex items-center gap-2">
            <Eye size={18} /> Live Preview
          </h2>

          <div className="space-y-5">
            {/* Buttons */}
            <div>
              <p className="text-xs text-proddaily-text-2 uppercase tracking-wide mb-2">Buttons</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Primary Button</Button>
                <Button size="sm" variant="secondary">Secondary</Button>
                <Button size="sm" variant="ghost">Ghost</Button>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <p className="text-xs text-proddaily-text-2 uppercase tracking-wide mb-2">Navigation</p>
              <div className="flex gap-1 bg-proddaily-bg-2 p-1 border border-proddaily-border">
                <span className="px-3 py-1.5 text-sm font-serif pd-accent-text bg-proddaily-card border-l-2 pd-accent-border">Active</span>
                <span className="px-3 py-1.5 text-sm font-serif text-proddaily-text-2">Inactive</span>
                <span className="px-3 py-1.5 text-sm font-serif text-proddaily-text-2">Inactive</span>
              </div>
            </div>

            {/* Borders / tiles */}
            <div>
              <p className="text-xs text-proddaily-text-2 uppercase tracking-wide mb-2">Borders & Tiles</p>
              <div className="flex gap-2">
                <div className="w-12 h-12 border-2 pd-accent-border bg-[#2a2a2a] flex items-center justify-center">
                  <span className="font-serif pd-accent-text">A</span>
                </div>
                <div className="w-12 h-12 border-2 border-[#4a4a4a] bg-[#2a2a2a] flex items-center justify-center">
                  <span className="font-serif text-proddaily-text-2">B</span>
                </div>
                <div className="w-12 h-12 pd-accent-bg flex items-center justify-center">
                  <span className="font-serif text-proddaily-bg">C</span>
                </div>
              </div>
            </div>

            {/* Color values */}
            <div className="pt-4 border-t border-proddaily-border">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-proddaily-text-2">Primary accent</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.primary }} />
                    <span className="text-proddaily-text font-mono">{theme.primary}</span>
                  </div>
                </div>
                <div>
                  <span className="text-proddaily-text-2">Secondary accent</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.secondary }} />
                    <span className="text-proddaily-text font-mono">{theme.secondary}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Site default info */}
            <div className="p-3 rounded-street bg-proddaily-bg-2 border border-proddaily-border">
              <p className="text-xs text-proddaily-text-2">
                Site default: <span className="text-proddaily-text">{ACCENT_PRESETS[siteDefault.preset].label}</span> ({siteDefault.primary})
              </p>
              <p className="text-xs text-proddaily-text-2 mt-1">
                Your preference: <span className="text-proddaily-text">{ACCENT_PRESETS[theme.preset].label}</span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
