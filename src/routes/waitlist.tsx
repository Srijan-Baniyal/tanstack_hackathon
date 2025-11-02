import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/waitlist')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/waitlist"!</div>
}
