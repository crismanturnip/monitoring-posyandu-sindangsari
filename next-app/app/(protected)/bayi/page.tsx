import { ChildRegisterPage, type ChildRegisterParams } from '@/components/child-register-page';

export default function BabyPage({ searchParams }: { searchParams: Promise<ChildRegisterParams> }) {
  return <ChildRegisterPage searchParams={searchParams} group="bayi" />;
}
