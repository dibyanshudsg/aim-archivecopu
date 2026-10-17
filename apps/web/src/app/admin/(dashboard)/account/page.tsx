import { AdminPasswordForm } from '../../password/password-form';
import { AdminPageTitle } from '../admin-page-title';

export default function AdminAccountPage() {
  return <div className="mx-auto max-w-3xl space-y-6"><header><AdminPageTitle title="Your account" description="Update your password to keep your admin account secure." /></header><AdminPasswordForm /></div>;
}
