import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <main className="standalone-state">
      <div className="standalone-mark"><ShieldAlert size={25} /></div>
      <span className="eyebrow">ACCESS RESTRICTED</span>
      <h1>That view isn’t assigned to your role.</h1>
      <p>Use the workspace navigation for the pages available to your account.</p>
      <Link className="primary-button" to="/">Return to my workspace <ArrowLeft size={16} /></Link>
    </main>
  )
}