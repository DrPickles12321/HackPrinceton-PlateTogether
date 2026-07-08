import { useEffect, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import DeleteAccountModal from '../components/DeleteAccountModal'
import CareTeamCard from '../components/CareTeamCard'

export default function AccountView() {
  const { deleteAccount, careTeam, revokeCareTeamAccess, reEnableCareTeamAccess } = useFirebaseData()
  const isMobile = useIsMobile()
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => { document.title = 'Account · Plate Together' }, [])

  return (
    <div style={{ padding: isMobile ? '6px 14px 24px' : '24px 32px', maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <h2 className="font-lora" style={{ fontSize: isMobile ? 23 : 26, fontWeight: isMobile ? 600 : 400, color: 'var(--text-dark)', margin: '6px 0 2px', lineHeight: 1.1 }}>
        Account
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 18px' }}>
        Who can see your data, and account settings
      </p>

      <CareTeamCard careTeam={careTeam} onRevoke={revokeCareTeamAccess} onReEnable={reEnableCareTeamAccess} />

      {/* Account · danger zone */}
      <div style={{
        marginTop: 24, padding: '18px 20px', borderRadius: 16,
        border: '1px solid var(--pink-mid)', background: 'var(--pink-light)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pink)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>
          Danger zone
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, margin: '0 0 14px' }}>
          Deleting your account permanently removes all of your data. This can't be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          style={{
            border: '1.5px solid var(--pink)', background: '#fff', color: 'var(--pink)',
            borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Delete account</button>
      </div>

      <DeleteAccountModal open={showDelete} onClose={() => setShowDelete(false)} onConfirm={deleteAccount} />
    </div>
  )
}
