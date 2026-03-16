import Image from 'next/image';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Suomen Asbestipro Oy"
            width={200}
            height={54}
            priority
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kiitos!</h1>
          <p className="text-gray-600 mb-2">Tilauksesi on vahvistettu.</p>
          <p className="text-gray-500 text-sm">
            Vahvistus on lähetetty sähköpostiisi.
          </p>
        </div>
      </div>
    </main>
  );
}
