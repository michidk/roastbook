import { ChartNoAxesCombined } from 'lucide-react'
import { linkOptions } from '@tanstack/react-router'
import type { SectionNavigationItem } from '@/components/section-layout'

export const extensionAdminSections = linkOptions([
  {
    to: '/admin/ai',
    search: { includeByo: false, days: 30 },
    label: 'AI costs and requests',
    icon: ChartNoAxesCombined,
  },
]) satisfies readonly SectionNavigationItem[]
