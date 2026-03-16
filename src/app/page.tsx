import Image from 'next/image';
import OrderForm from '@/components/OrderForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Suomen Asbestipro Oy"
            width={240}
            height={65}
            priority
          />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tilausvahvistus</h1>
          <p className="text-gray-600 mt-1">Asbesti- ja haitta-ainekartoitus</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <OrderForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Suomen Asbestipro Oy
        </p>
      </div>
    </main>
  );
}
