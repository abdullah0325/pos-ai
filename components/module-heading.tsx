import type { ReactNode } from 'react'
import { LayoutDashboard, Wallet, Users, Package, Factory, Settings2, Boxes, FileText, Building2 } from 'lucide-react'

const icons = {
  dashboard: LayoutDashboard,
  accounts: Wallet,
  employees: Users,
  inventory: Package,
  production: Factory,
  settings: Settings2,
  materials: Boxes,
  invoices: FileText,
  customers: Building2,
}

// Keep each screen's original heading, descriptions, and actions together.
export default function ModuleHeading({ icon, children, className = '' }: { icon: keyof typeof icons; children: ReactNode; className?: string }) {
  const Icon = icons[icon]
  return (
    <div className={`page-heading module-heading ${className}`}>
      <div className="module-heading-icon" aria-hidden="true"><Icon /></div>
      {children}
    </div>
  )
}
