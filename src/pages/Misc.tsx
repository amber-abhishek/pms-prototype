import { Link } from 'react-router-dom';
import { Lock } from '../components/icons';
import listingSiteArt from './listing-site.svg';
import { toast } from 'sonner';
import { Button, Empty, Page, PageHeader } from '../components/ui';

/* ---------------- Locked / no access / 404 ---------------- */
export function Locked() {
  return (
    <>
      <PageHeader icon={Lock} title="Listing site" />
      <Page className="flex items-center justify-center">
        <div className="max-w-md text-center">
          <img src={listingSiteArt} width={204} height={160} alt="" className="mx-auto mb-6" />
          <h2 className="text-lg font-semibold">Listing site isn't in your plan</h2>
          <p className="text-sm text-gray-500 mt-1.5">Your own branded booking site for your halls.</p>
          <div className="mt-5 flex justify-center gap-2"><Button onClick={() => toast('Brochure opens in the real product')}>Learn more</Button><Button variant="primary" onClick={() => toast.success('Request sent to your account manager')}>Request access</Button></div>
        </div>
      </Page>
    </>
  );
}

export function NoAccess() {
  return (
    <Page className="flex items-center justify-center">
      <Empty icon={Lock} title="You don't have access to this module" sub="Your role doesn't include it. Switch to Super admin from the user menu to see it." action={<Link to="/"><Button>Back to Overview</Button></Link>} />
    </Page>
  );
}

export function NotFound() {
  return (
    <Page className="flex items-center justify-center">
      <Empty title="Page not found" sub="That link doesn't go anywhere in this prototype." action={<Link to="/"><Button>Back to Overview</Button></Link>} />
    </Page>
  );
}
