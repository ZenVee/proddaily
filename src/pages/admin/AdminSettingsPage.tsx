import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/state/ToastContext';
import {
  Settings, Gamepad2, Shield, Sparkles, Save,
} from 'lucide-react';

export function AdminSettingsPage() {
  const { toast } = useToast();

  function handlePlaceholder(action: string) {
    toast(`${action} — this is a placeholder for future backend functionality.`, 'info');
  }

  const sections = [
    {
      title: 'General Site Settings',
      icon: Settings,
      description: 'Site name, tagline, and global configuration.',
      fields: [
        { label: 'Site Name', value: 'Prod Daily', placeholder: 'Site name' },
        { label: 'Tagline', value: 'Word puzzles for the community.', placeholder: 'Tagline' },
        { label: 'Support Email', value: '', placeholder: 'support@proddaily.example' },
      ],
    },
    {
      title: 'Game Management',
      icon: Gamepad2,
      description: 'Default puzzle settings and scheduling rules.',
      fields: [
        { label: 'Wordle Reset Time', value: '00:00', placeholder: 'HH:MM' },
        { label: 'Default Crossword Size', value: '12x12', placeholder: 'Grid size' },
        { label: 'Max Daily Puzzles', value: '1', placeholder: 'Number' },
      ],
    },
    {
      title: 'Administration',
      icon: Shield,
      description: 'Access control and admin user management.',
      fields: [
        { label: 'Admin Email', value: '', placeholder: 'admin@proddaily.example' },
        { label: 'Session Timeout', value: '30', placeholder: 'Minutes' },
      ],
    },
    {
      title: 'Future Features',
      icon: Sparkles,
      description: 'Placeholder for upcoming puzzle types and features.',
      fields: [],
    },
  ];

  return (
    <AdminLayout current="Settings">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-proddaily-text mb-1">Settings</h1>
        <p className="text-sm text-proddaily-text-2">Configure site-wide options. These are placeholders for future backend integration.</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-proddaily-bg-2 flex items-center justify-center">
                <section.icon size={18} className="pd-accent-text" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-proddaily-text">{section.title}</h2>
                <p className="text-xs text-proddaily-text-2">{section.description}</p>
              </div>
            </div>

            {section.fields.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm text-proddaily-text-2 mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      defaultValue={field.value}
                      placeholder={field.placeholder}
                      className="w-full bg-proddaily-bg-2 border border-proddaily-border rounded-lg px-3.5 py-2.5 text-proddaily-text text-sm focus:outline-none focus-visible:pd-accent-ring transition-all placeholder:text-proddaily-text-2/50"
                      readOnly
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-proddaily-text-2">
                  No settings yet. Additional puzzle types and features will be configured here in the future.
                </p>
              </div>
            )}

            {section.fields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-proddaily-border">
                <Button variant="secondary" size="sm" onClick={() => handlePlaceholder(`Save ${section.title}`)}>
                  <Save size={14} /> Save Changes
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-proddaily-bg-2 border border-proddaily-border flex items-start gap-3">
        <Sparkles size={18} className="pd-accent-text flex-shrink-0 mt-0.5" />
        <p className="text-xs text-proddaily-text-2">
          These settings are display-only in the frontend prototype. They will be connected to a real backend in production.
        </p>
      </div>
    </AdminLayout>
  );
}
