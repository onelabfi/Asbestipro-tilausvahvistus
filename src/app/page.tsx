import Image from 'next/image';
import Link from 'next/link';
import OrderForm from '@/components/OrderForm';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#101921' }}>
      {/* Header */}
      <div className="w-full py-8">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Suomen Asbestipro Oy"
              width={240}
              height={65}
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Tilausvahvistus</h1>
            <p className="text-gray-400 mt-1">Asbesti- ja haitta-ainekartoitus</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <OrderForm />
        </div>

        {/* Footer - hidden admin link */}
        <p className="text-center text-xs text-gray-500 mt-8">
          <Link href="/admin" className="hover:text-gray-400 transition-colors">
            &copy; Suomen Asbestipro Oy
          </Link>
        </p>
      </div>
    </main>
  );
}
