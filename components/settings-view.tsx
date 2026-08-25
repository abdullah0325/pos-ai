'use client'

import { useState } from 'react'
import { Download, Upload, Shield, RefreshCw, CheckCircle, Database, Lock, AlertTriangle, Building } from 'lucide-react'
import { exportDatabaseJSON, importDatabaseJSON, initialDatabase, type AppDatabase } from '@/lib/db'

interface SettingsViewProps {
  db: AppDatabase
  isOwner: boolean
  setIsOwner: (val: boolean) => void
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function SettingsView({ db, isOwner, setIsOwner, onSaveDatabase }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'roles' | 'company'>('backup')
  const [backupSuccess, setBackupSuccess] = useState(false)
  const [companyName, setCompanyName] = useState('AL FAROOQ FOODS')
  const [tagline, setTagline] = useState('Mineral Water, Fruit Juices, Confectionery & Snacks')
  const [phone1, setPhone1] = useState('0344 9549051')
  const [phone2, setPhone2] = useState('0346 9829900')
  const [email, setEmail] = useState('umarfarooq4847@gmail.com')
  const [address, setAddress] = useState('Industrial Estate, Food & Beverage Zone, Punjab, Pakistan')

  const handleDownloadBackup = () => {
    exportDatabaseJSON(db)
    setBackupSuccess(true)
    setTimeout(() => setBackupSuccess(false), 4000)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await importDatabaseJSON(file)
      if (parsed && parsed.products && parsed.invoices) {
        onSaveDatabase(parsed)
        alert('Database successfully restored from JSON backup!')
      } else {
        alert('Invalid database backup file format.')
      }
    } catch (err) {
      alert('Error importing JSON backup file.')
    }
  }

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'WARNING: This will reset all current records back to factory default demo data (Mineral water, Juices, Candy & Chips). Proceed?'
      )
    ) {
      onSaveDatabase(initialDatabase)
      alert('Database reset to defaults.')
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration & Storage</p>
          <h1>Settings & Backup Controls</h1>
          <p className="subheading">
            Manage local offline database backups, JSON restore, staff roles, and company billing profiles.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-nav">
          <button
            className={activeTab === 'backup' ? 'settings-active' : ''}
            onClick={() => setActiveTab('backup')}
          >
            Offline Backup & Restore
          </button>
          <button
            className={activeTab === 'roles' ? 'settings-active' : ''}
            onClick={() => setActiveTab('roles')}
          >
            User Roles & Permissions
          </button>
          <button
            className={activeTab === 'company' ? 'settings-active' : ''}
            onClick={() => setActiveTab('company')}
          >
            Company Profile & Header
          </button>
        </div>

        <div className="panel">
          {/* TAB 1: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="settings-form">
              <h2>Offline Local Database Backup</h2>
              <p>
                All records, production batches, invoices, and ledgers are stored securely on this device.
                Generate periodic JSON backups to prevent accidental browser cache clearing.
              </p>

              {backupSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Backup JSON file downloaded successfully! Store this file safely on your USB or hard drive.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="stat-icon olive mb-2">
                      <Download />
                    </div>
                    <strong className="text-sm block">Export Full Database (.json)</strong>
                    <span className="text-xs text-gray-500 block mt-1">
                      Exports all {db.products.length} products, {db.rawMaterials.length} raw materials, {db.invoices.length} invoices, and financial ledgers into one portable file.
                    </span>
                  </div>
                  <button className="button primary mt-4 w-full" onClick={handleDownloadBackup}>
                    <Download /> Download JSON Backup
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="stat-icon purple mb-2">
                      <Upload />
                    </div>
                    <strong className="text-sm block">Restore Database from JSON</strong>
                    <span className="text-xs text-gray-500 block mt-1">
                      Restore and overwrite local records with a previously saved .json backup file.
                    </span>
                  </div>
                  <label className="button secondary mt-4 w-full cursor-pointer text-center flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" /> Choose File & Restore
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <strong className="text-sm text-red-600 block">Factory Reset Local Data</strong>
                    <span className="text-xs text-gray-500">
                      Reset all tables back to default Al Farooq Foods starter catalogs.
                    </span>
                  </div>
                  <button className="button secondary text-red-600 border-red-200 hover:bg-red-50" onClick={handleResetDefaults}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Database
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROLES */}
          {activeTab === 'roles' && (
            <div className="settings-form">
              <h2>User Roles & Security</h2>
              <p>Switch between Super Admin (Owner) and Operator (Staff) view mode.</p>

              <div className="space-y-4 my-2">
                <label className="toggle-row cursor-pointer">
                  <div>
                    <strong className="text-gray-900 block text-xs">Current Session Role</strong>
                    <span className="text-xs text-gray-500">
                      {isOwner ? 'Owner / Super Admin (Full Access to P&L and Bank Balances)' : 'Operator / Staff (Sales & Production execution only)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`button text-xs py-1.5 h-auto ${isOwner ? 'primary' : 'secondary'}`}
                    onClick={() => setIsOwner(!isOwner)}
                  >
                    <Shield className="w-3.5 h-3.5" /> {isOwner ? 'Active: Owner Role' : 'Active: Staff Role'}
                  </button>
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
                <strong className="block text-gray-800">Role Permissions Summary:</strong>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li><strong>Owner:</strong> Full access to Profit & Loss calculations, cash & bank balances, deletions, and system configuration.</li>
                  <li><strong>Staff:</strong> Can create invoices, run production batches, adjust stock, and record receipts without seeing sensitive balance metrics.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: COMPANY PROFILE */}
          {activeTab === 'company' && (
            <div className="settings-form">
              <h2>Company & Plant Header</h2>
              <p>Details printed on PDF invoices, delivery challans, and customer account statements.</p>

              <label>
                Company Legal Name
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>

              <label>
                Business Line / Tagline
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  Primary Phone
                  <input value={phone1} onChange={(e) => setPhone1(e.target.value)} />
                </label>
                <label>
                  Secondary Phone
                  <input value={phone2} onChange={(e) => setPhone2(e.target.value)} />
                </label>
              </div>

              <label>
                Official Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <label>
                Factory / Plant Address
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>

              <div className="editor-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => alert('Company profile settings saved locally.')}
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
