import type { AdminActivity } from '@/types';
import { loadJSON, saveJSON } from '@/utils/storage';
import { seedAdminActivity } from '@/data/mockData';
import { uid } from '@/utils/helpers';

const KEY = 'admin-activity';

export const adminService = {
  getActivity(): AdminActivity[] {
    return loadJSON<AdminActivity[]>(KEY, seedAdminActivity());
  },

  logActivity(action: string, detail: string): AdminActivity[] {
    const all = this.getActivity();
    all.unshift({
      id: uid(),
      action,
      detail,
      timestamp: new Date().toISOString(),
    });
    saveJSON(KEY, all);
    return all;
  },
};
