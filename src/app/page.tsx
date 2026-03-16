import Image from 'next/image';
import OrderForm from '@/components/OrderForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="w-full py-8 mb-6" style={{ backgroundColor: '#101921' }}>
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

      <div className="max-w-lg mx-auto px-4">

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
