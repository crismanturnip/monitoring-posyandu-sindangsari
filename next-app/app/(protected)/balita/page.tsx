import { ChildRegisterPage, type ChildRegisterParams } from '@/components/child-register-page';

export default function BalitaPage({ searchParams }: { searchParams: Promise<ChildRegisterParams> }) {
  return <ChildRegisterPage searchParams={searchParams} group="balita" />;
}
