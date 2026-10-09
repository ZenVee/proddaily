import { useState } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { useTheme } from '@/state/ThemeContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ACCENT_PRESETS, ACCENT_ORDER, isValidHex } from '@/utils/theme';
import { cn } from '@/utils/helpers';
import { useToast } from '@/state/ToastContext';
import type { AccentPreset } from '@/types';

export function AppearanceControl() {
  const { theme, setPreset, setCustomHex } = useTheme();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customHexInput, setCustomHexInput] = useState(theme.customHex);
  const [selectedPreset, setSelectedPreset] = useState<AccentPreset>(theme.preset);

  function handlePreset(preset: AccentPreset) {
    setSelectedPreset(preset);
    setPreset(preset);
  }

  function handleCustomHex() {
    if (!isValidHex(customHexInput)) {
      toast('Enter a valid 6-digit hex color.', 'error');
      return;
    }
    setSelectedPreset('custom');
    setCustomHex(customHexInput);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-street text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors"
        title="Appearance"
        aria-label="Appearance settings"
      >
        <Palette size={18} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Appearance" showClose={true}>
        <div className="space-y-5">
          <div>
            <p className="text-sm text-proddaily-text-2 mb-3">Choose your accent color. This affects buttons, navigation, and highlights throughout the site.</p>

            <div className="grid grid-cols-3 gap-3">
              {ACCENT_ORDER.map((presetId) => {
                const opt = ACCENT_PRESETS[presetId];
                const isSelected = selectedPreset === presetId;
                return (
                  <button
                    key={presetId}
                    onClick={() => handlePreset(presetId)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-street border transition-colors',
                      isSelected ? 'pd-accent-border bg-proddaily-bg-2' : 'border-proddaily-border'
                    )}
                  >
                    <div
                      className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: opt.primary,
                        borderColor: isSelected ? opt.primary : '#383838',
                      }}
                    >
                      {isSelected && <Check size={14} className="text-proddaily-bg" />}
                    </div>
                    <span className="text-xs text-proddaily-text-2">{opt.label}</span>
                  </button>
                );
              })}
            </div>
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
              <Button variant="secondary" onClick={handleCustomHex}>Apply</Button>
            </div>
          </div>

          <p className="text-xs text-proddaily-text-2">
            Your preference is saved in your browser. Game feedback colors stay the same regardless of accent.
          </p>
        </div>
      </Modal>
    </>
  );
}
