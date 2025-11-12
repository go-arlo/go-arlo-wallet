import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Solana Wallet with Delegated Access
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Secure sub-organization isolation with policy-based access control for automated Solana transactions
        </p>

        <Link
          href="/demo/delegated-access"
          className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xl font-semibold px-16 py-5 rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105"
        >
          Start Demo
        </Link>

        <div className="mt-20">
          <h3 className="text-2xl font-semibold text-gray-800 mb-12">Demo Steps</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Create Sub-Organization</h4>
              </div>
              <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gray-300"></div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Apply Policies</h4>
              </div>
              <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gray-300"></div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Create Delegated Access</h4>
              </div>
              <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gray-300"></div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Execute Jupiter Swap</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
