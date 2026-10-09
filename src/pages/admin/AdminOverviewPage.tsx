import { useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { wordleService } from '@/services/wordleService';
import { crosswordService } from '@/services/crosswordService';
import { adminService } from '@/services/adminService';
import { useRouter } from '@/state/RouterContext';
import { todayStr, timeAgo } from '@/utils/helpers';
import { Type, Grid3x3, FileEdit, Calendar, Clock, Activity, ArrowRight } from 'lucide-react';

export function AdminOverviewPage() {
  const { navigate } = useRouter();

  const data = useMemo(() => {
    const wordlePuzzles = wordleService.getPuzzles();
    const crosswords = crosswordService.getAll();
    const activity = adminService.getActivity();
    const today = todayStr();
    const todayWordle = wordlePuzzles.find((p) => p.date === today);
    const publishedCrosswords = crosswords.filter((p) => p.status === 'published').length;
    const draftPuzzles = crosswords.filter((p) => p.status === 'draft').length;

    return {
      todayWordle,
      publishedCrosswords,
      draftPuzzles,
      totalGames: wordlePuzzles.length + crosswords.length,
      activity,
    };
  }, []);

  const summaryCards = [
    {
      label: "Today's Wordle",
      value: data.todayWordle ? data.todayWordle.word : 'Not Set',
      status: data.todayWordle ? 'Active' : 'Not Set',
      icon: Type,
      variant: data.todayWordle ? 'green' : 'yellow',
    },
    {
      label: 'Published Crosswords',
      value: String(data.publishedCrosswords),
      icon: Grid3x3,
      variant: 'accent' as const,
    },
    {
      label: 'Draft Puzzles',
      value: String(data.draftPuzzles),
      icon: FileEdit,
      variant: 'default' as const,
    },
    {
      label: 'Total Games',
      value: String(data.totalGames),
      icon: Calendar,
      variant: 'default' as const,
    },
  ];

  const quickActions = [
    { label: 'Set Daily Word', icon: Type, action: () => navigate({ page: 'admin-wordle' }) },
    { label: 'Create Crossword', icon: Grid3x3, action: () => navigate({ page: 'admin-crossword-edit', id: null }) },
    { label: 'Manage Puzzles', icon: FileEdit, action: () => navigate({ page: 'admin-crossword' }) },
  ];

  return (
    <AdminLayout current="Overview">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-proddaily-text mb-1">Overview</h1>
        <p className="text-sm text-proddaily-text-2">A snapshot of your puzzle management dashboard.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-5 border-t-2 pd-accent-border">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-proddaily-bg-2 flex items-center justify-center">
                <card.icon size={18} className="pd-accent-text" />
              </div>
              {'status' in card && card.status && (
                <Badge variant={card.variant as 'green' | 'yellow' | 'accent' | 'default'}>{card.status}</Badge>
              )}
            </div>
            <p className="text-xs text-proddaily-text-2 uppercase tracking-wide mb-1">{card.label}</p>
            <p className="font-serif text-2xl text-proddaily-text">{card.value}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="font-serif text-xl text-proddaily-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card key={action.label} hover className="p-5" >
              <div onClick={action.action}>
                <div className="flex items-center gap-3 mb-2">
                  <action.icon size={20} className="pd-accent-text" />
                  <span className="font-medium text-proddaily-text">{action.label}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-proddaily-text-2">
                  Go <ArrowRight size={14} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="font-serif text-xl text-proddaily-text mb-4">Recent Activity</h2>
        <Card className="divide-y divide-proddaily-border">
          {data.activity.length === 0 ? (
            <div className="p-6 text-center text-sm text-proddaily-text-2">No recent activity.</div>
          ) : (
            data.activity.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-proddaily-bg-2 flex items-center justify-center flex-shrink-0">
                  <Activity size={14} className="pd-accent-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-proddaily-text">{entry.action}</p>
                  <p className="text-xs text-proddaily-text-2">{entry.detail}</p>
                </div>
                <span className="text-xs text-proddaily-text-2 flex items-center gap-1 flex-shrink-0">
                  <Clock size={12} /> {timeAgo(entry.timestamp)}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
