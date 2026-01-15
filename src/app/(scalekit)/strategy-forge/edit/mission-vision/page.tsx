import { redirect } from 'next/navigation';

export default function MissionVisionRedirect(): never {
  redirect('/strategy-forge/edit/mission');
}
