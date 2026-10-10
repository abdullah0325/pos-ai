import BusinessApp from '@/components/business-app'
import PinGate from '@/components/pin-gate'
import ConfirmationProvider from '@/components/confirmation-provider'

export default function Page() {
  return <PinGate><ConfirmationProvider><BusinessApp /></ConfirmationProvider></PinGate>
}
