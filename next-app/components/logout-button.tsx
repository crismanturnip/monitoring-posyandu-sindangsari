import { signOut } from '@/app/(auth)/actions';

export function LogoutButton() {
  return <form action={signOut} className="logout-form"><button type="submit">Keluar</button></form>;
}
